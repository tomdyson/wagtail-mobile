import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { DateField } from "../DateField";
import type { BlockSchema } from "../../lib/types";
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
