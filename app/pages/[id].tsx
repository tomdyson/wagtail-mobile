import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { DateField } from "../../components/DateField";
import { PageListSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { StreamFieldEditor } from "../../components/streamfield/StreamFieldEditor";
import { ApiError, pages, schema, type SchemaDetail } from "../../lib/api";
import { useAuth } from "../../lib/hooks/useAuth";
import { usePageDetail } from "../../lib/hooks/usePages";
import { markdownPayload } from "../../lib/richtext";
import { prepareBlocksForSave } from "../../lib/streamfield";
import type { PageDetail, StreamFieldBlock } from "../../lib/types";

const SKIP_FIELDS = new Set([
  "id",
  "title",
  "slug",
  "meta",
  "hints",
  "alias_of",
]);

function isSimpleField(value: unknown): boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  );
}

function isComplexField(value: unknown): boolean {
  return Array.isArray(value) || (typeof value === "object" && value !== null);
}

type DateFieldMode = "date" | "datetime";

function buildDateFieldMap(
  schemaDetail: SchemaDetail | null
): Map<string, DateFieldMode> {
  const map = new Map<string, DateFieldMode>();
  if (!schemaDetail) return map;
  const props = schemaDetail.create_schema.properties;
  for (const [name, def] of Object.entries(props)) {
    const d = def as Record<string, unknown>;
    let format: string | undefined;
    if (d.format) {
      format = String(d.format);
    } else if (d.anyOf && Array.isArray(d.anyOf)) {
      for (const opt of d.anyOf as Array<Record<string, unknown>>) {
        if (opt.format) {
          format = String(opt.format);
          break;
        }
      }
    }
    if (format === "date-time") {
      map.set(name, "datetime");
    } else if (format === "date") {
      map.set(name, "date");
    }
  }
  return map;
}

export default function PageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { baseUrl, token } = useAuth();
  const router = useRouter();
  const { page, loading, error, refresh } = usePageDetail(Number(id), "markdown");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [editedFields, setEditedFields] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [schemaDetail, setSchemaDetail] = useState<SchemaDetail | null>(null);

  // Fetch schema when we know the page type
  useEffect(() => {
    if (page?.meta.type) {
      schema
        .get(baseUrl, token, page.meta.type)
        .then(setSchemaDetail)
        .catch(() => {}); // non-critical, fields just won't get date pickers
    }
  }, [page?.meta.type, baseUrl, token]);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setEditedFields({});
    }
  }, [page]);

  const dateFields = buildDateFieldMap(schemaDetail);

  const isDirty =
    page !== null &&
    (title !== page.title ||
      slug !== page.slug ||
      Object.keys(editedFields).length > 0);

  const handleSave = useCallback(async () => {
    if (!page) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};
      if (title !== page.title) data.title = title;
      if (slug !== page.slug) data.slug = slug;
      for (const [key, value] of Object.entries(editedFields)) {
        if (
          streamFieldNames.has(key) &&
          Array.isArray(value) &&
          schemaDetail?.streamfield_blocks?.[key]
        ) {
          data[key] = prepareBlocksForSave(
            value as StreamFieldBlock[],
            schemaDetail.streamfield_blocks[key]
          );
        } else if (richTextFieldNames.has(key) && typeof value === "string") {
          data[key] = markdownPayload(value);
        } else {
          data[key] = value;
        }
      }
      await pages.update(baseUrl, token, page.id, data);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      Alert.alert("Save failed", msg);
    } finally {
      setSaving(false);
    }
  }, [page, title, slug, editedFields, baseUrl, token, refresh, schemaDetail]);

  const handlePublish = useCallback(async () => {
    if (!page) return;
    try {
      await pages.publish(baseUrl, token, page.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      Alert.alert("Publish failed", msg);
    }
  }, [page, baseUrl, token, refresh]);

  const handleUnpublish = useCallback(async () => {
    if (!page) return;
    Alert.alert("Unpublish", "Revert this page to draft?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unpublish",
        style: "destructive",
        onPress: async () => {
          try {
            await pages.unpublish(baseUrl, token, page.id);
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            refresh();
          } catch (e) {
            const msg = e instanceof ApiError ? e.message : String(e);
            Alert.alert("Unpublish failed", msg);
          }
        },
      },
    ]);
  }, [page, baseUrl, token, refresh]);

  const handleDelete = useCallback(async () => {
    if (!page) return;
    Alert.alert(
      "Delete page",
      `Are you sure you want to delete "${page.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await pages.delete(baseUrl, token, page.id);
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              router.back();
            } catch (e) {
              const msg = e instanceof ApiError ? e.message : String(e);
              Alert.alert("Delete failed", msg);
            }
          },
        },
      ]
    );
  }, [page, baseUrl, token, router]);

  if (loading && !page) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Page" }} />
        <View style={{ padding: 16 }}>
          <PageListSkeleton count={4} />
        </View>
      </View>
    );
  }

  if (error && !page) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Error" }} />
        <Text style={styles.errorText}>{error.message}</Text>
        <Pressable onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!page) return null;

  const permissions = page.meta.user_permissions || [];
  const canPublish = permissions.includes("publish");
  const canEdit = permissions.includes("change");
  const canDelete = permissions.includes("delete");
  const showPublish =
    canPublish && (!page.meta.live || page.meta.has_unpublished_changes);
  const showUnpublish = canPublish && page.meta.live;

  const richTextFieldNames = new Set(schemaDetail?.richtext_fields || []);
  const streamFieldNames = new Set(
    Object.keys(schemaDetail?.streamfield_blocks || {})
  );
  const extraFields = Object.entries(page).filter(
    ([key]) => !SKIP_FIELDS.has(key)
  );
  const richTextFields = extraFields.filter(
    ([key, value]) => richTextFieldNames.has(key) && typeof value === "string"
  );
  const simpleFields = extraFields.filter(
    ([key, value]) => isSimpleField(value) && !richTextFieldNames.has(key)
  );
  const streamFields = extraFields.filter(
    ([key, value]) => streamFieldNames.has(key) && Array.isArray(value)
  );
  const complexFields = extraFields.filter(
    ([key, value]) => isComplexField(value) && !streamFieldNames.has(key)
  );

  const shortType = page.meta.type
    .split(".")
    .pop()
    ?.replace(/([A-Z])/g, " $1")
    .trim();

  const getFieldValue = (key: string): unknown =>
    editedFields[key] !== undefined ? editedFields[key] : page[key];

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: page.title,
          headerRight: () =>
            isDirty ? (
              <Pressable onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            ) : null,
        }}
      />

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
            <View style={styles.statusRow}>
              <Text style={styles.typeLabel}>{shortType}</Text>
              <StatusBadge
                live={page.meta.live}
                hasUnpublishedChanges={page.meta.has_unpublished_changes}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                style={styles.fieldInput}
                value={title}
                onChangeText={setTitle}
                editable={canEdit}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Slug</Text>
              <TextInput
                style={styles.fieldInput}
                value={slug}
                onChangeText={setSlug}
                autoCapitalize="none"
                autoCorrect={false}
                editable={canEdit}
              />
            </View>

            {page.meta.url_path && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>URL path</Text>
                <Text style={styles.readOnlyValue}>{page.meta.url_path}</Text>
              </View>
            )}
          </View>

          {simpleFields.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fields</Text>
              {simpleFields.map(([key, value]) => {
                const dateMode = dateFields.get(key);
                if (dateMode) {
                  const currentVal = getFieldValue(key);
                  return (
                    <DateField
                      key={key}
                      label={key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                      value={currentVal != null ? String(currentVal) : null}
                      onChange={(v) =>
                        setEditedFields((prev) => ({ ...prev, [key]: v }))
                      }
                      mode={dateMode}
                      editable={canEdit}
                    />
                  );
                }
                return (
                  <View key={key} style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      {key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                    </Text>
                    <TextInput
                      style={styles.fieldInput}
                      value={
                        editedFields[key] !== undefined
                          ? String(editedFields[key])
                          : String(value ?? "")
                      }
                      onChangeText={(text) =>
                        setEditedFields((prev) => ({ ...prev, [key]: text }))
                      }
                      editable={canEdit}
                    />
                  </View>
                );
              })}
            </View>
          )}

          {richTextFields.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rich Text</Text>
              {richTextFields.map(([key, value]) => {
                const mdValue =
                  editedFields[key] !== undefined
                    ? String(editedFields[key])
                    : String(value ?? "");
                return (
                  <View key={key} style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      {key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
                    </Text>
                    <TextInput
                      style={[styles.fieldInput, styles.richTextInput]}
                      value={mdValue}
                      onChangeText={(text) =>
                        setEditedFields((prev) => ({ ...prev, [key]: text }))
                      }
                      editable={canEdit}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                );
              })}
            </View>
          )}

          {streamFields.map(([key]) => (
            <View key={key} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
              </Text>
              <StreamFieldEditor
                blocks={
                  (getFieldValue(key) as StreamFieldBlock[]) || []
                }
                blockTypes={
                  schemaDetail?.streamfield_blocks?.[key] || []
                }
                onChange={(newBlocks) =>
                  setEditedFields((prev) => ({ ...prev, [key]: newBlocks }))
                }
                editable={canEdit}
              />
            </View>
          ))}

          {complexFields.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Content</Text>
              {complexFields.map(([key]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}{" "}
                    <Text style={styles.viewOnly}>(view only)</Text>
                  </Text>
                  <Text style={styles.readOnlyValue} numberOfLines={4}>
                    {JSON.stringify(page[key], null, 2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Info</Text>
            {page.meta.first_published_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>First published</Text>
                <Text style={styles.infoValue}>
                  {new Date(page.meta.first_published_at).toLocaleDateString()}
                </Text>
              </View>
            )}
            {page.meta.last_published_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last published</Text>
                <Text style={styles.infoValue}>
                  {new Date(page.meta.last_published_at).toLocaleDateString()}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Children</Text>
              <Text style={styles.infoValue}>{page.meta.children_count}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            {showPublish && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.publishButton,
                  pressed && styles.actionPressed,
                ]}
                onPress={handlePublish}
              >
                <Text style={styles.publishButtonText}>Publish</Text>
              </Pressable>
            )}
            {showUnpublish && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.unpublishButton,
                  pressed && styles.actionPressed,
                ]}
                onPress={handleUnpublish}
              >
                <Text style={styles.unpublishButtonText}>Unpublish</Text>
              </Pressable>
            )}
            {canDelete && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.deleteButton,
                  pressed && styles.actionPressed,
                ]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: 12,
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
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
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
  richTextInput: {
    minHeight: 150,
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
  },
  readOnlyValue: {
    fontSize: 14,
    color: "#6B7280",
    paddingVertical: 4,
    fontFamily: "monospace",
  },
  viewOnly: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  actions: {
    gap: 10,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionPressed: {
    opacity: 0.7,
  },
  publishButton: {
    backgroundColor: "#10B981",
  },
  publishButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  unpublishButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  unpublishButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
  },
  retryText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
});
