import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { DateField } from "../DateField";
import { ReadOnlyBlock } from "../streamfield/ReadOnlyBlock";
import { ImageChooser } from "../streamfield/ImageChooser";
import { PageChooser } from "../streamfield/PageChooser";
import { StreamFieldEditor } from "../streamfield/StreamFieldEditor";
import { formStyles } from "./FormStyles";
import type { FieldDefinition, FieldValue, TextFieldDefinition } from "../../lib/forms/types";
import { getBooleanValue, getTextValue, isNumberField, isTextField } from "../../lib/forms/model";
import type { StreamFieldBlock } from "../../lib/types";

interface Props {
  field: Exclude<FieldDefinition, Extract<FieldDefinition, { kind: "inlinePanel" }>>;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  editable: boolean;
}

function ChoiceInput({
  field,
  value,
  onChange,
  editable,
}: {
  field: TextFieldDefinition;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  editable: boolean;
}) {
  const current = getTextValue(value);
  const choices = field.schemaMeta.enum || [];

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

export function FieldInputRenderer({ field, value, onChange, editable }: Props) {
  if (field.kind === "text" && field.schemaMeta.enum?.length) {
    return (
      <ChoiceInput
        field={field}
        value={value}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  if (isTextField(field)) {
    return (
      <TextInput
        style={formStyles.fieldInput}
        value={getTextValue(value)}
        onChangeText={onChange}
        editable={editable}
        keyboardType={
          field.schemaMeta.inputType === "url"
            ? "url"
            : field.schemaMeta.inputType === "email"
              ? "email-address"
              : "default"
        }
        autoCapitalize={field.schemaMeta.inputType === "text" ? "sentences" : "none"}
        autoCorrect={field.schemaMeta.inputType === "text"}
      />
    );
  }

  if (field.kind === "richText") {
    return (
      <TextInput
        style={[formStyles.fieldInput, formStyles.richTextInput]}
        value={getTextValue(value)}
        onChangeText={onChange}
        editable={editable}
        multiline
        textAlignVertical="top"
      />
    );
  }

  if (isNumberField(field)) {
    return (
      <TextInput
        style={formStyles.fieldInput}
        value={value == null ? "" : String(value)}
        onChangeText={(text) => {
          if (text === "") {
            onChange(null);
            return;
          }

          if (field.schemaMeta.numberType === "integer") {
            if (/^-?\d+$/.test(text)) {
              onChange(Number.parseInt(text, 10));
            }
            return;
          }

          if (/^-?\d*(\.\d*)?$/.test(text) && text !== "-" && text !== "." && text !== "-.") {
            onChange(Number.parseFloat(text));
          }
        }}
        editable={editable}
        keyboardType="numeric"
      />
    );
  }

  if (field.kind === "boolean") {
    return (
      <Switch
        value={getBooleanValue(value)}
        onValueChange={onChange}
        disabled={!editable}
      />
    );
  }

  if (field.kind === "date" || field.kind === "datetime") {
    return (
      <DateField
        label=""
        value={value == null ? null : String(value)}
        onChange={onChange}
        mode={field.kind === "datetime" ? "datetime" : "date"}
        required={field.required}
        editable={editable}
      />
    );
  }

  if (field.kind === "imageChooser") {
    return (
      <ImageChooser
        value={value}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  if (field.kind === "pageChooser") {
    return (
      <PageChooser
        value={value}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  if (field.kind === "streamField") {
    return (
      <StreamFieldEditor
        blocks={Array.isArray(value) ? (value as StreamFieldBlock[]) : []}
        blockTypes={field.schemaMeta.blockTypes}
        onChange={onChange}
        editable={editable}
      />
    );
  }

  return (
    <ReadOnlyBlock
      value={value}
      schemaType={field.kind === "readOnly" ? field.schemaMeta.message || "unknown" : "unknown"}
    />
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
