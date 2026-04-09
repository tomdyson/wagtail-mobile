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
import {
  ApiError,
  pageActions,
  schema,
  type SchemaDetail,
  type SchemaPageType,
} from "../../lib/api";
import { useAuth } from "../../lib/hooks/useAuth";

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

function extractSimpleFields(schemaDetail: SchemaDetail): FieldInfo[] {
  const props = schemaDetail.create_schema.properties;
  const required = new Set(schemaDetail.create_schema.required || []);
  const streamFields = new Set(
    Object.keys(schemaDetail.streamfield_blocks || {})
  );
  const richFields = new Set(schemaDetail.richtext_fields || []);

  const fields: FieldInfo[] = [];
  for (const [name, def] of Object.entries(props)) {
    if (SKIP_FIELDS.has(name)) continue;
    if (streamFields.has(name) || richFields.has(name)) continue;

    const d = def as Record<string, unknown>;
    let fieldType = "string";
    let format: string | undefined;
    if (d.type === "array") continue;
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

    fields.push({ name, title, type: fieldType, format, required: required.has(name) });
  }
  return fields;
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

      const page = await pageActions.create(baseUrl, token, data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      Alert.alert("Create failed", msg);
    } finally {
      setSaving(false);
    }
  }, [selectedType, parentId, title, slug, publish, fieldValues, baseUrl, token, router]);

  const simpleFields = schemaDetail ? extractSimpleFields(schemaDetail) : [];

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
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40,
  },
});
