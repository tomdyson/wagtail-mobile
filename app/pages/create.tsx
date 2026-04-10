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
  View,
} from "react-native";

import { FieldSectionRenderer } from "../../components/forms/FieldSectionRenderer";
import { formStyles } from "../../components/forms/FormStyles";
import {
  ApiError,
  pageActions,
  schema,
  type SchemaDetail,
  type SchemaPageType,
} from "../../lib/api";
import {
  buildCreateFormModel,
  getSectionedFields,
  serializeCreatePayload,
  setFormErrors,
  updateFieldValue,
  validateForm,
} from "../../lib/forms/model";
import type { FieldSection, FieldValue, FormState } from "../../lib/forms/types";
import { useAuth } from "../../lib/hooks/useAuth";

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
  const [formState, setFormState] = useState<FormState | null>(null);
  const [publish, setPublish] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectType = useCallback(
    async (pageType: SchemaPageType) => {
      setSelectedType(pageType);
      setSchemaDetail(null);
      setFormState(null);
      setLoadingSchema(true);
      try {
        const detail = await schema.get(baseUrl, token, pageType.type);
        setSchemaDetail(detail);
      } catch {
        Alert.alert("Error", "Could not load field schema");
      } finally {
        setLoadingSchema(false);
      }
    },
    [baseUrl, token]
  );

  useEffect(() => {
    (async () => {
      try {
        const result = await schema.list(baseUrl, token);
        const parentEntry = result.page_types.find((pageType) => pageType.type === parentType);
        const allowedChildTypes = parentEntry?.allowed_subpage_types;
        const filtered = result.page_types.filter((pageType) => {
          if (!parentType || !allowedChildTypes) return true;
          return allowedChildTypes.includes(pageType.type);
        });
        setAllowedTypes(filtered);
        if (filtered.length === 1) {
          void selectType(filtered[0]);
        }
      } catch {
        Alert.alert("Error", "Could not load page types");
      } finally {
        setLoadingTypes(false);
      }
    })();
  }, [baseUrl, token, parentType, selectType]);

  useEffect(() => {
    if (schemaDetail) {
      setFormState(buildCreateFormModel(schemaDetail));
    }
  }, [schemaDetail]);

  const handleFieldChange = useCallback((fieldName: string, value: FieldValue) => {
    setFormState((current) =>
      current ? updateFieldValue(current, fieldName, value) : current
    );
  }, []);

  const handleCreate = useCallback(async () => {
    if (!selectedType || !formState) return;

    const errors = validateForm(formState, "create");
    if (Object.keys(errors).length > 0) {
      setFormState((current) => (current ? setFormErrors(current, errors) : current));
      return;
    }

    setSaving(true);
    try {
      const payload = serializeCreatePayload(formState, {
        type: selectedType.type,
        parent: Number(parentId),
        ...(publish ? { action: "publish" } : {}),
      });

      await pageActions.create(baseUrl, token, payload);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : String(error);
      Alert.alert("Create failed", message);
    } finally {
      setSaving(false);
    }
  }, [baseUrl, formState, parentId, publish, router, selectedType, token]);

  if (loadingTypes) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "New Page" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!selectedType) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Choose Type" }} />
        <View style={styles.typeList}>
          {allowedTypes.map((pageType) => (
            <Pressable
              key={pageType.type}
              style={({ pressed }) => [
                styles.typeRow,
                pressed && styles.typeRowPressed,
              ]}
              onPress={() => {
                void selectType(pageType);
              }}
            >
              <Text style={styles.typeRowTitle}>{pageType.verbose_name}</Text>
              <Text style={styles.typeRowSubtitle}>{pageType.type}</Text>
            </Pressable>
          ))}
          {allowedTypes.length === 0 && (
            <Text style={styles.emptyText}>No page types can be created here</Text>
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
            <Pressable onPress={handleCreate} disabled={saving || !formState}>
              <Text style={styles.createButton}>
                {saving ? "Creating..." : "Create"}
              </Text>
            </Pressable>
          ),
        }}
      />

      {loadingSchema || !formState ? (
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
            {getSectionedFields(formState.fields).map(({ section, fields }) => (
              <FieldSectionRenderer
                key={section}
                title={sectionTitle(section)}
                fields={fields}
                values={formState.values}
                errors={formState.errors}
                onChange={handleFieldChange}
                editable
              />
            ))}

            <View style={formStyles.section}>
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
