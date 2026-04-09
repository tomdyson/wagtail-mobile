import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { DateField } from "../DateField";
import { defaultValueForBlock } from "../../lib/streamfield";
import type { BlockSchema } from "../../lib/types";
import { ImageChooser } from "./ImageChooser";
import { PageChooser } from "./PageChooser";
import { ReadOnlyBlock } from "./ReadOnlyBlock";

interface Props {
  value: unknown;
  schema: BlockSchema;
  onChange: (value: unknown) => void;
  editable: boolean;
}

function ChoiceEditor({
  value,
  choices,
  onChange,
  editable,
}: {
  value: unknown;
  choices: string[];
  onChange: (v: string) => void;
  editable: boolean;
}) {
  const current = String(value ?? "");
  return (
    <View style={choiceStyles.container}>
      {choices.map((choice) => (
        <Pressable
          key={choice}
          style={[
            choiceStyles.chip,
            current === choice && choiceStyles.chipSelected,
            !editable && choiceStyles.chipDisabled,
          ]}
          onPress={() => editable && onChange(choice)}
        >
          <Text
            style={[
              choiceStyles.chipText,
              current === choice && choiceStyles.chipTextSelected,
            ]}
          >
            {choice}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const choiceStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  chipSelected: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  chipDisabled: {
    opacity: 0.6,
  },
  chipText: {
    fontSize: 14,
    color: "#374151",
  },
  chipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
});

function StructBlockEditor({
  value,
  schema,
  onChange,
  editable,
}: {
  value: Record<string, unknown>;
  schema: BlockSchema;
  onChange: (v: Record<string, unknown>) => void;
  editable: boolean;
}) {
  if (!schema.properties) return null;

  return (
    <View style={structStyles.container}>
      {Object.entries(schema.properties).map(([key, childSchema]) => {
        const childValue = value[key];
        const label = key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

        return (
          <View key={key} style={structStyles.field}>
            <Text style={structStyles.label}>{label}</Text>
            <BlockEditor
              value={childValue}
              schema={childSchema}
              onChange={(newVal) => onChange({ ...value, [key]: newVal })}
              editable={editable}
            />
          </View>
        );
      })}
    </View>
  );
}

const structStyles = StyleSheet.create({
  container: {
    gap: 10,
  },
  field: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
});

function ListBlockEditor({
  value,
  schema,
  onChange,
  editable,
}: {
  value: unknown[];
  schema: BlockSchema;
  onChange: (v: unknown[]) => void;
  editable: boolean;
}) {
  const itemSchema = schema.items!;
  const itemLabel = itemSchema.type.endsWith("_chooser") ? "item" : itemSchema.type.replace(/_/g, " ");

  return (
    <View style={listStyles.container}>
      {value.map((item, index) => (
        <View key={index} style={listStyles.item}>
          <View style={listStyles.itemContent}>
            <BlockEditor
              value={item}
              schema={itemSchema}
              onChange={(newVal) => {
                const updated = [...value];
                updated[index] = newVal;
                onChange(updated);
              }}
              editable={editable}
            />
          </View>
          {editable && (
            <View style={listStyles.itemActions}>
              {index > 0 && (
                <Pressable
                  onPress={() => {
                    const updated = [...value];
                    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
                    onChange(updated);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-up" size={16} color="#9CA3AF" />
                </Pressable>
              )}
              {index < value.length - 1 && (
                <Pressable
                  onPress={() => {
                    const updated = [...value];
                    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
                    onChange(updated);
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  Alert.alert("Remove item", `Remove this ${itemLabel}?`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Remove",
                      style: "destructive",
                      onPress: () => onChange(value.filter((_, i) => i !== index)),
                    },
                  ]);
                }}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </Pressable>
            </View>
          )}
        </View>
      ))}
      {editable && (
        <Pressable
          style={({ pressed }) => [
            listStyles.addButton,
            pressed && listStyles.addButtonPressed,
          ]}
          onPress={() => onChange([...value, defaultValueForBlock(itemSchema)])}
        >
          <Text style={listStyles.addButtonText}>+ Add {itemLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const listStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  item: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#FAFAFA",
    gap: 8,
  },
  itemContent: {
    flex: 1,
  },
  itemActions: {
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addButton: {
    paddingVertical: 8,
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
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
  },
});

export function BlockEditor({ value, schema, onChange, editable }: Props) {
  if (schema.type === "richtext") {
    return (
      <TextInput
        style={[styles.input, styles.richTextInput]}
        value={typeof value === "string" ? value : ""}
        onChangeText={onChange}
        editable={editable}
        multiline
        textAlignVertical="top"
      />
    );
  }

  if (schema.type === "string" && schema.enum) {
    return (
      <ChoiceEditor
        value={value}
        choices={schema.enum}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  if (schema.type === "string" || schema.type === "url" || schema.type === "email") {
    return (
      <TextInput
        style={styles.input}
        value={typeof value === "string" ? value : String(value ?? "")}
        onChangeText={onChange}
        editable={editable}
        keyboardType={
          schema.type === "url"
            ? "url"
            : schema.type === "email"
              ? "email-address"
              : "default"
        }
        autoCapitalize={schema.type === "url" || schema.type === "email" ? "none" : "sentences"}
      />
    );
  }

  if (schema.type === "integer" || schema.type === "float") {
    return (
      <TextInput
        style={styles.input}
        value={value != null ? String(value) : ""}
        onChangeText={(text) => {
          if (text === "" || text === "-") {
            onChange(text);
            return;
          }
          const num =
            schema.type === "integer" ? parseInt(text, 10) : parseFloat(text);
          if (!isNaN(num)) onChange(num);
        }}
        editable={editable}
        keyboardType="numeric"
      />
    );
  }

  if (schema.type === "boolean") {
    return (
      <Switch
        value={Boolean(value)}
        onValueChange={onChange}
        disabled={!editable}
      />
    );
  }

  if (schema.type === "date" || schema.type === "datetime") {
    return (
      <DateField
        label=""
        value={value != null ? String(value) : null}
        onChange={(v) => onChange(v)}
        mode={schema.type === "datetime" ? "datetime" : "date"}
        editable={editable}
      />
    );
  }

  if (
    schema.type === "object" &&
    schema.properties &&
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return (
      <StructBlockEditor
        value={value as Record<string, unknown>}
        schema={schema}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  if (schema.type === "image_chooser") {
    return (
      <ImageChooser
        value={value}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  if (schema.type === "page_chooser") {
    return (
      <PageChooser
        value={value}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  if (schema.type === "array" && schema.items) {
    return (
      <ListBlockEditor
        value={Array.isArray(value) ? value : []}
        schema={schema}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  return <ReadOnlyBlock value={value} schemaType={schema.type} />;
}

const styles = StyleSheet.create({
  input: {
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
    minHeight: 120,
    fontFamily: "monospace",
    fontSize: 14,
    lineHeight: 20,
  },
});
