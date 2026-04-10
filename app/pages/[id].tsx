import { usePreventRemove } from "@react-navigation/core";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { FieldRenderer } from "../../components/forms/FieldRenderer";
import { FieldSectionRenderer } from "../../components/forms/FieldSectionRenderer";
import { formStyles } from "../../components/forms/FormStyles";
import { PageListSkeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { ApiError, pages, schema, type SchemaDetail } from "../../lib/api";
import {
  buildEditFormModel,
  getSectionedFields,
  getTextValue,
  hasDirtyFields,
  serializeEditPayload,
  setFormErrors,
  updateFieldValue,
  validateForm,
} from "../../lib/forms/model";
import type { FieldSection, FieldValue, FormState } from "../../lib/forms/types";
import { useAuth } from "../../lib/hooks/useAuth";
import { usePageDetail } from "../../lib/hooks/usePages";

function sectionTitle(section: FieldSection): string | undefined {
  switch (section) {
    case "fields":
      return "Fields";
    case "richText":
      return "Rich Text";
    case "media":
      return "Media";
    case "content":
      return "Content";
    default:
      return undefined;
  }
}

export default function PageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { baseUrl, token } = useAuth();
  const router = useRouter();
  const { page, loading, error, refresh } = usePageDetail(Number(id), "markdown");

  const [schemaDetail, setSchemaDetail] = useState<SchemaDetail | null>(null);
  const [schemaResolved, setSchemaResolved] = useState(false);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!page?.meta.type) return;

    setSchemaResolved(false);
    schema
      .get(baseUrl, token, page.meta.type)
      .then((detail) => setSchemaDetail(detail))
      .catch(() => setSchemaDetail(null))
      .finally(() => setSchemaResolved(true));
  }, [baseUrl, page?.meta.type, token]);

  useEffect(() => {
    if (page && schemaResolved) {
      setFormState(buildEditFormModel(page, schemaDetail));
    }
  }, [page, schemaDetail, schemaResolved]);

  const handleFieldChange = useCallback((fieldName: string, value: FieldValue) => {
    setFormState((current) =>
      current ? updateFieldValue(current, fieldName, value) : current
    );
  }, []);

  const isDirty = formState ? hasDirtyFields(formState) : false;

  usePreventRemove(isDirty, () => {
    Alert.alert("Unsaved changes", "Discard your changes?", [
      { text: "Keep editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          if (page) {
            setFormState(buildEditFormModel(page, schemaDetail));
          }
          setTimeout(() => router.back(), 0);
        },
      },
    ]);
  });

  const handleSave = useCallback(async () => {
    if (!page || !formState) return;

    const errors = validateForm(formState, "edit");
    if (Object.keys(errors).length > 0) {
      setFormState((current) => (current ? setFormErrors(current, errors) : current));
      return;
    }

    const payload = serializeEditPayload(formState);
    if (Object.keys(payload).length === 0) return;

    setSaving(true);
    try {
      await pages.update(baseUrl, token, page.id, payload);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch (saveError) {
      const message = saveError instanceof ApiError ? saveError.message : String(saveError);
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  }, [baseUrl, formState, page, refresh, token]);

  const handlePublish = useCallback(async () => {
    if (!page) return;
    try {
      await pages.publish(baseUrl, token, page.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch (publishError) {
      const message =
        publishError instanceof ApiError ? publishError.message : String(publishError);
      Alert.alert("Publish failed", message);
    }
  }, [baseUrl, page, refresh, token]);

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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            refresh();
          } catch (unpublishError) {
            const message =
              unpublishError instanceof ApiError
                ? unpublishError.message
                : String(unpublishError);
            Alert.alert("Unpublish failed", message);
          }
        },
      },
    ]);
  }, [baseUrl, page, refresh, token]);

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
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (deleteError) {
              const message =
                deleteError instanceof ApiError ? deleteError.message : String(deleteError);
              Alert.alert("Delete failed", message);
            }
          },
        },
      ]
    );
  }, [baseUrl, page, router, token]);

  const sections = useMemo(
    () => (formState ? getSectionedFields(formState.fields) : []),
    [formState]
  );

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

  if (!page || !formState || !schemaResolved) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Page" }} />
        <View style={{ padding: 16 }}>
          <PageListSkeleton count={4} />
        </View>
      </View>
    );
  }

  const permissions = page.meta.user_permissions || [];
  const canPublish = permissions.includes("publish");
  const canEdit = permissions.includes("change");
  const canDelete = permissions.includes("delete");
  const showPublish =
    canPublish && (!page.meta.live || page.meta.has_unpublished_changes);
  const showUnpublish = canPublish && page.meta.live;
  const shortType = page.meta.type
    .split(".")
    .pop()
    ?.replace(/([A-Z])/g, " $1")
    .trim();
  const identityFields =
    sections.find((section) => section.section === "identity")?.fields || [];
  const otherSections = sections.filter((section) => section.section !== "identity");
  const pageTitle = getTextValue(formState.values.title) || page.title;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: pageTitle,
          headerBackButtonMenuEnabled: false,
          headerRight: () =>
            isDirty ? (
              <Pressable onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButton}>{saving ? "Saving..." : "Save"}</Text>
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
          <View style={formStyles.section}>
            <View style={styles.statusRow}>
              <Text style={styles.typeLabel}>{shortType}</Text>
              {page.meta.live && page.meta.url_path ? (
                <Pressable
                  onPress={() => {
                    const origin = new URL(baseUrl).origin;
                    void WebBrowser.openBrowserAsync(origin + page.meta.url_path);
                  }}
                >
                  <StatusBadge
                    live={page.meta.live}
                    hasUnpublishedChanges={page.meta.has_unpublished_changes}
                  />
                </Pressable>
              ) : (
                <StatusBadge
                  live={page.meta.live}
                  hasUnpublishedChanges={page.meta.has_unpublished_changes}
                />
              )}
            </View>

            {identityFields.map((field) => (
              <FieldRenderer
                key={field.name}
                field={field}
                value={formState.values[field.name]}
                error={formState.errors[field.name]}
                onChange={(value) => handleFieldChange(field.name, value)}
                editable={canEdit && field.editable}
              />
            ))}

            {page.meta.url_path && (
              <View style={formStyles.fieldGroup}>
                <Text style={formStyles.fieldLabel}>URL path</Text>
                <Text style={formStyles.readOnlyValue}>{page.meta.url_path}</Text>
              </View>
            )}
          </View>

          {otherSections.map(({ section, fields }) => (
            <FieldSectionRenderer
              key={section}
              title={sectionTitle(section)}
              fields={fields}
              values={formState.values}
              errors={formState.errors}
              onChange={handleFieldChange}
              editable={canEdit}
            />
          ))}

          <View style={formStyles.section}>
            <Text style={formStyles.sectionTitle}>Info</Text>
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
