import { Switch, Text, View } from "react-native";

import type { FieldDefinition, FieldValue } from "../../lib/forms/types";
import { getBooleanValue } from "../../lib/forms/model";
import { FieldInputRenderer } from "./FieldInputRenderer";
import { formStyles } from "./FormStyles";
import { InlinePanelRenderer } from "./InlinePanelRenderer";

interface Props {
  field: FieldDefinition;
  value: FieldValue;
  error?: string;
  onChange: (value: FieldValue) => void;
  editable: boolean;
}

function renderLabel(field: FieldDefinition): string {
  return field.kind === "readOnly"
    ? `${field.label} (view only)`
    : field.label;
}

export function FieldRenderer({
  field,
  value,
  error,
  onChange,
  editable,
}: Props) {
  if (field.kind === "boolean") {
    return (
      <View style={formStyles.fieldGroup}>
        <View style={formStyles.switchRow}>
          <Text style={formStyles.switchLabel}>{field.label}</Text>
          <Switch
            value={getBooleanValue(value)}
            onValueChange={onChange}
            disabled={!editable}
          />
        </View>
        {error && <Text style={formStyles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={formStyles.fieldGroup}>
      <Text style={formStyles.fieldLabel}>
        {renderLabel(field)}
        {field.required && field.kind !== "readOnly" && (
          <Text style={formStyles.required}> *</Text>
        )}
      </Text>

      {field.kind === "inlinePanel" ? (
        <InlinePanelRenderer
          field={field}
          value={value}
          onChange={onChange}
          editable={editable}
        />
      ) : (
        <FieldInputRenderer
          field={field}
          value={value}
          onChange={onChange}
          editable={editable}
        />
      )}

      {error && <Text style={formStyles.errorText}>{error}</Text>}
    </View>
  );
}
