import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { DateField } from "../../components/DateField";
import { ImageChooser } from "../../components/streamfield/ImageChooser";
import { StreamFieldEditor } from "../../components/streamfield/StreamFieldEditor";
import {
  ApiError,
  pageActions,
  schema,
  type SchemaDetail,
  type SchemaPageType,
} from "../../lib/api";
import { useAuth } from "../../lib/hooks/useAuth";
import {
  defaultValueForBlock,
  findBlockSchema,
  generateBlockId,
  isBlockEditable,
  prepareBlocksForSave,
} from "../../lib/streamfield";
import { markdownPayload } from "../../lib/richtext";
import type { BlockTypeSchema, StreamFieldBlock } from "../../lib/types";

const SKIP_FIELDS = new Set([
  "type",
  "parent",
  "action",
  "title",
  "slug",
  "alias_of",
  "id",
]);

interface FieldInfo {
  name: string;
  title: string;
  type: string;
  format?: string;
  required: boolean;
}

interface InlinePanelFieldDef {
  [prop: string]: { type: string; required: boolean };
}

interface SchemaExtract {
  simpleFields: FieldInfo[];
  imageChooserFields: string[];
  richTextFields: string[];
  inlinePanels: { name: string; fields: InlinePanelFieldDef }[];
}

function extractFieldInfo(schemaDetail: SchemaDetail): SchemaExtract {
  const props = schemaDetail.create_schema.properties;
  const required = new Set(schemaDetail.create_schema.required || []);
  const streamFields = new Set(
    Object.keys(schemaDetail.streamfield_blocks || {})
  );
  const richFieldNames = new Set(schemaDetail.richtext_fields || []);
  const defs = (schemaDetail.create_schema as Record<string, unknown>)["$defs"] as
    Record<string, Record<string, unknown>> | undefined;

  const simpleFields: FieldInfo[] = [];
  const imageChooserFields: string[] = [];
  const richTextFields: string[] = [];
  const inlinePanels: { name: string; fields: InlinePanelFieldDef }[] = [];

  for (const [name, def] of Object.entries(props)) {
    if (SKIP_FIELDS.has(name)) continue;
    if (streamFields.has(name)) continue;

    const d = def as Record<string, unknown>;

    // Rich text fields
    if (richFieldNames.has(name)) {
      richTextFields.push(name);
      continue;
    }

    // Image chooser FK fields
    if (d.widget === "image_chooser") {
      imageChooserFields.push(name);
      continue;
    }

    // Inline panels: arrays with $ref to $defs
    if (d.type === "array" && d.items && defs) {
      const items = d.items as Record<string, unknown>;
      const ref = items["$ref"] as string | undefined;
      if (ref?.startsWith("#/$defs/")) {
        const defName = ref.replace("#/$defs/", "");
        const defSchema = defs[defName];
        if (defSchema?.properties) {
          const defProps = defSchema.properties as Record<string, Record<string, unknown>>;
          const reqSet = new Set((defSchema.required as string[]) || []);
          const fieldDefs: InlinePanelFieldDef = {};
          for (const [pName, pDef] of Object.entries(defProps)) {
            if (pName === "id") continue;
            let pType = (pDef.type as string) || "";
            if (!pType && pDef.anyOf) {
              const types = (pDef.anyOf as Array<Record<string, unknown>>)
                .filter((t) => t.type !== "null")
                .map((t) => t.type as string);
              pType = types[0] || "string";
            }
            fieldDefs[pName] = { type: pType || "string", required: reqSet.has(pName) };
          }
          if (Object.keys(fieldDefs).length > 0) {
            inlinePanels.push({ name, fields: fieldDefs });
          }
        }
        continue;
      }
      // Other arrays (e.g. ListBlock at top level) — skip
      continue;
    }

    // Simple fields
    let fieldType = "string";
    let format: string | undefined;
    if (d.type) fieldType = String(d.type);
    if (d.format) format = String(d.format);
    if (d.anyOf && Array.isArray(d.anyOf)) {
      for (const opt of d.anyOf as Array<Record<string, unknown>>) {
        if (opt.type && opt.type !== "null") fieldType = String(opt.type);
        if (opt.format) format = String(opt.format);
      }
    }

    const title = d.title
      ? String(d.title)
      : name.replace(/_/g, " ").replace(/^\w/, (c: string) => c.toUpperCase());

    simpleFields.push({ name, title, type: fieldType, format, required: required.has(name) });
  }

  return { simpleFields, imageChooserFields, richTextFields, inlinePanels };
}

export default function CreatePageScreen() {
  const { parentId, parentType } = useLocalSearchParams<{
    parentId: string;
    parentType?: string;
  }>();
  const { baseUrl, token } = useAuth();
  const router = useRouter();

  const [loadingTypes, setLoadingTypes] = useState(true);
  const [allowedTypes, setAllowedTypes] = useState<SchemaPageType[]>([]);
  const [selectedType, setSelectedType] = useState<SchemaPageType | null>(null);
  const [schemaDetail, setSchemaDetail] = useState<SchemaDetail | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [imageFieldValues, setImageFieldValues] = useState<Record<string, number | null>>({});
  const [richTextValues, setRichTextValues] = useState<Record<string, string>>({});
  const [inlinePanelValues, setInlinePanelValues] = useState<
    Record<string, Record<string, unknown>[]>
  >({});
  const [streamFieldValues, setStreamFieldValues] = useState<
    Record<string, StreamFieldBlock[]>
  >({});
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch allowed child types for this parent
  useEffect(() => {
    (async () => {
      try {
        const result = await schema.list(baseUrl, token);
        // Find what subpage types the parent allows
        const parentEntry = result.page_types.find(
          (pt) => pt.type === parentType
        );
        const allowedChildTypes = parentEntry?.allowed_subpage_types;
        // Filter to types the parent allows as children
        const filtered = result.page_types.filter((pt) => {
          if (!parentType || !allowedChildTypes) return true;
          return allowedChildTypes.includes(pt.type);
        });
        setAllowedTypes(filtered);
        if (filtered.length === 1) {
          selectType(filtered[0]);
        }
      } catch (e) {
        Alert.alert("Error", "Could not load page types");
      } finally {
        setLoadingTypes(false);
      }
    })();
  }, [baseUrl, token, parentType]);

  const selectType = useCallback(
    async (pt: SchemaPageType) => {
      setSelectedType(pt);
      setLoadingSchema(true);
      try {
        const detail = await schema.get(baseUrl, token, pt.type);
        setSchemaDetail(detail);
      } catch (e) {
        Alert.alert("Error", "Could not load field schema");
      } finally {
        setLoadingSchema(false);
      }
    },
    [baseUrl, token]
  );

  const handleCreate = useCallback(async () => {
    if (!selectedType || !title.trim()) {
      Alert.alert("Required", "Title is required");
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        type: selectedType.type,
        parent: Number(parentId),
        title: title.trim(),
      };
      if (slug.trim()) {
        data.slug = slug.trim();
      }
      if (publish) {
        data.action = "publish";
      }
      for (const [key, value] of Object.entries(fieldValues)) {
        if (value.trim()) {
          data[key] = value.trim();
        }
      }
      for (const [key, value] of Object.entries(imageFieldValues)) {
        if (value != null) {
          data[key] = value;
        }
      }
      for (const [key, value] of Object.entries(richTextValues)) {
        if (value.trim()) {
          data[key] = markdownPayload(value);
        }
      }
      for (const [key, items] of Object.entries(inlinePanelValues)) {
        if (items.length > 0) {
          data[key] = items;
        }
      }
      for (const [key, blocks] of Object.entries(streamFieldValues)) {
        if (blocks.length > 0 && schemaDetail?.streamfield_blocks?.[key]) {
          data[key] = prepareBlocksForSave(
            blocks,
            schemaDetail.streamfield_blocks[key]
          );
        }
      }

      const page = await pageActions.create(baseUrl, token, data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      Alert.alert("Create failed", msg);
    } finally {
      setSaving(false);
    }
  }, [selectedType, parentId, title, slug, publish, fieldValues, streamFieldValues, schemaDetail, baseUrl, token, router]);

  const extracted = schemaDetail ? extractFieldInfo(schemaDetail) : null;
  const simpleFields = extracted?.simpleFields || [];
  const streamFieldEntries = Object.entries(
    schemaDetail?.streamfield_blocks || {}
  );

  if (loadingTypes) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "New Page" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Type picker (if multiple allowed types)
  if (!selectedType) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Choose Type" }} />
        <View style={styles.typeList}>
          {allowedTypes.map((pt) => (
            <Pressable
              key={pt.type}
              style={({ pressed }) => [
                styles.typeRow,
                pressed && styles.typeRowPressed,
              ]}
              onPress={() => selectType(pt)}
            >
              <Text style={styles.typeRowTitle}>{pt.verbose_name}</Text>
              <Text style={styles.typeRowSubtitle}>{pt.type}</Text>
            </Pressable>
          ))}
          {allowedTypes.length === 0 && (
            <Text style={styles.emptyText}>
              No page types can be created here
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `New ${selectedType.verbose_name}`,
          headerRight: () => (
            <Pressable onPress={handleCreate} disabled={saving}>
              <Text style={styles.createButton}>
                {saving ? "Creating..." : "Create"}
              </Text>
            </Pressable>
          ),
        }}
      />

      {loadingSchema ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.section}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Title <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Page title"
                  autoFocus
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Slug</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={slug}
                  onChangeText={setSlug}
                  placeholder="Auto-generated from title"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {simpleFields.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fields</Text>
                {simpleFields.map((field) => {
                  if (field.format === "date" || field.format === "date-time") {
                    return (
                      <DateField
                        key={field.name}
                        label={field.title}
                        value={fieldValues[field.name] || null}
                        onChange={(v) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [field.name]: v || "",
                          }))
                        }
                        mode={field.format === "date-time" ? "datetime" : "date"}
                        required={field.required}
                      />
                    );
                  }
                  return (
                    <View key={field.name} style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>
                        {field.title}
                        {field.required && (
                          <Text style={styles.required}> *</Text>
                        )}
                      </Text>
                      <TextInput
                        style={styles.fieldInput}
                        value={fieldValues[field.name] || ""}
                        onChangeText={(text) =>
                          setFieldValues((prev) => ({
                            ...prev,
                            [field.name]: text,
                          }))
                        }
                        keyboardType={
                          field.type === "integer" || field.type === "float"
                            ? "numeric"
                            : "default"
                        }
                        autoCapitalize="none"
                      />
                    </View>
                  );
                })}
              </View>
            )}

            {extracted && extracted.imageChooserFields.length > 0 && (
              <View style={styles.section}>
                {extracted.imageChooserFields.map((name) => (
                  <View key={name} style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      {name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                    </Text>
                    <ImageChooser
                      value={imageFieldValues[name] ?? null}
                      onChange={(id) =>
                        setImageFieldValues((prev) => ({ ...prev, [name]: id }))
                      }
                      editable={true}
                    />
                  </View>
                ))}
              </View>
            )}

            {extracted && extracted.richTextFields.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rich Text</Text>
                {extracted.richTextFields.map((name) => (
                  <View key={name} style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      {name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                    </Text>
                    <TextInput
                      style={[styles.fieldInput, styles.richTextInput]}
                      value={richTextValues[name] || ""}
                      onChangeText={(text) =>
                        setRichTextValues((prev) => ({ ...prev, [name]: text }))
                      }
                      multiline
                      textAlignVertical="top"
                      placeholder="Markdown content..."
                      placeholderTextColor="#D1D5DB"
                    />
                  </View>
                ))}
              </View>
            )}

            {extracted && extracted.inlinePanels.map(({ name, fields: panelFields }) => {
              const items = inlinePanelValues[name] || [];
              const fieldProps = Object.keys(panelFields);
              return (
                <View key={name} style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                  </Text>
                  {items.map((item, index) => (
                    <View key={index} style={styles.inlineItem}>
                      <View style={styles.inlineItemFields}>
                        {fieldProps.map((prop) => (
                          <View key={prop} style={styles.inlineField}>
                            <Text style={styles.inlineFieldLabel}>
                              {prop.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                            </Text>
                            <TextInput
                              style={styles.fieldInput}
                              value={String(item[prop] ?? "")}
                              onChangeText={(text) => {
                                const updated = items.map((it, i) =>
                                  i === index ? { ...it, [prop]: text } : it
                                );
                                setInlinePanelValues((prev) => ({ ...prev, [name]: updated }));
                              }}
                              placeholder={panelFields[prop].required ? "Required" : "Optional"}
                              placeholderTextColor="#D1D5DB"
                            />
                          </View>
                        ))}
                      </View>
                      <Pressable
                        onPress={() => {
                          const updated = items.filter((_, i) => i !== index);
                          setInlinePanelValues((prev) => ({ ...prev, [name]: updated }));
                        }}
                        hitSlop={8}
                        style={styles.inlineDeleteButton}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable
                    style={({ pressed }) => [
                      styles.inlineAddButton,
                      pressed && styles.inlineAddButtonPressed,
                    ]}
                    onPress={() => {
                      const newItem: Record<string, unknown> = {};
                      for (const [prop, def] of Object.entries(panelFields)) {
                        newItem[prop] = def.type === "integer" ? null : "";
                      }
                      setInlinePanelValues((prev) => ({
                        ...prev,
                        [name]: [...(prev[name] || []), newItem],
                      }));
                    }}
                  >
                    <Text style={styles.inlineAddButtonText}>
                      + Add {name.replace(/_/g, " ").slice(0, -1)}
                    </Text>
                  </Pressable>
                </View>
              );
            })}

            {streamFieldEntries.map(([fieldName, blockTypes]) => {
              const blocks = streamFieldValues[fieldName] || [];
              const label = fieldName
                .replace(/_/g, " ")
                .replace(/^\w/, (c) => c.toUpperCase());
              // Filter to editable block types for the add picker
              const editableTypes = blockTypes.filter((bt) =>
                isBlockEditable(bt.schema)
              );

              return (
                <View key={fieldName} style={styles.section}>
                  <Text style={styles.sectionTitle}>{label}</Text>
                  <StreamFieldEditor
                    blocks={blocks}
                    blockTypes={blockTypes}
                    onChange={(newBlocks) =>
                      setStreamFieldValues((prev) => ({
                        ...prev,
                        [fieldName]: newBlocks,
                      }))
                    }
                    editable={true}
                  />
                  {editableTypes.length > 0 && (
                    <View style={styles.addBlockRow}>
                      {editableTypes.map((bt) => (
                        <Pressable
                          key={bt.type}
                          style={({ pressed }) => [
                            styles.addBlockChip,
                            pressed && styles.addBlockChipPressed,
                          ]}
                          onPress={() => {
                            const newBlock: StreamFieldBlock = {
                              type: bt.type,
                              value: defaultValueForBlock(bt.schema),
                              id: generateBlockId(),
                            };
                            setStreamFieldValues((prev) => ({
                              ...prev,
                              [fieldName]: [...(prev[fieldName] || []), newBlock],
                            }));
                          }}
                        >
                          <Text style={styles.addBlockChipText}>
                            + {bt.type.replace(/_/g, " ")}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.section}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Publish immediately</Text>
                <Switch value={publish} onValueChange={setPublish} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    padding: 16,
    gap: 20,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  typeList: {
    padding: 16,
    gap: 8,
  },
  typeRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 2,
  },
  typeRowPressed: {
    backgroundColor: "#F3F4F6",
  },
  typeRowTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    textTransform: "capitalize",
  },
  typeRowSubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  required: {
    color: "#EF4444",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FAFAFA",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 16,
    color: "#111827",
  },
  createButton: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
  addBlockRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  addBlockChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
  },
  addBlockChipPressed: {
    backgroundColor: "#EFF6FF",
  },
  addBlockChipText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
  },
  richTextInput: {
    minHeight: 120,
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
  },
  inlineItem: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#FAFAFA",
    gap: 8,
  },
  inlineItemFields: {
    flex: 1,
    gap: 6,
  },
  inlineField: {
    gap: 2,
  },
  inlineFieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  inlineDeleteButton: {
    justifyContent: "center",
    padding: 4,
  },
  inlineAddButton: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
    alignItems: "center",
  },
  inlineAddButtonPressed: {
    backgroundColor: "#EFF6FF",
  },
  inlineAddButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40,
  },
});
