import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { getDefaultFieldValue } from "../../lib/forms/model";
import type {
  FieldValue,
  InlinePanelFieldDefinition,
  InlinePanelItemValue,
} from "../../lib/forms/types";
import { FieldInputRenderer } from "./FieldInputRenderer";
import { formStyles } from "./FormStyles";

interface Props {
  field: InlinePanelFieldDefinition;
  value: FieldValue;
  onChange: (value: InlinePanelItemValue[]) => void;
  editable: boolean;
}

function singularize(label: string): string {
  return label.endsWith("s") ? label.slice(0, -1) : label;
}

export function InlinePanelRenderer({
  field,
  value,
  onChange,
  editable,
}: Props) {
  const items = Array.isArray(value) ? (value as InlinePanelItemValue[]) : [];
  const itemLabel = singularize(field.label.toLowerCase());

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View
          key={item.id != null ? String(item.id) : `new-${index}`}
          style={styles.item}
        >
          <View style={styles.itemFields}>
            {field.schemaMeta.fields.map((childField) => (
              <View key={childField.name} style={styles.childField}>
                <Text style={styles.childLabel}>
                  {childField.label}
                  {childField.required && (
                    <Text style={formStyles.required}> *</Text>
                  )}
                </Text>
                <FieldInputRenderer
                  field={childField}
                  value={(item[childField.name] ?? getDefaultFieldValue(childField)) as FieldValue}
                  onChange={(nextValue) => {
                    const updated = items.map((entry, itemIndex) =>
                      itemIndex === index
                        ? { ...entry, [childField.name]: nextValue }
                        : entry
                    );
                    onChange(updated);
                  }}
                  editable={editable}
                />
              </View>
            ))}
          </View>
          {editable && (
            <Pressable
              onPress={() => {
                Alert.alert("Remove", `Remove this ${itemLabel}?`, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                      onChange(items.filter((_, itemIndex) => itemIndex !== index));
                    },
                  },
                ]);
              }}
              hitSlop={8}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </Pressable>
          )}
        </View>
      ))}

      {editable && (
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() => {
            const nextItem: InlinePanelItemValue = { id: null };
            for (const childField of field.schemaMeta.fields) {
              nextItem[childField.name] = getDefaultFieldValue(childField);
            }
            onChange([...items, nextItem]);
          }}
        >
          <Text style={styles.addButtonText}>+ Add {itemLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  item: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#FAFAFA",
    gap: 8,
  },
  itemFields: {
    flex: 1,
    gap: 8,
  },
  childField: {
    gap: 4,
  },
  childLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  deleteButton: {
    justifyContent: "center",
    padding: 4,
  },
  addButton: {
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
    alignItems: "center",
  },
  addButtonPressed: {
    backgroundColor: "#EFF6FF",
  },
  addButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "500",
  },
});
