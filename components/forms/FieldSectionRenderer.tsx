import { Text, View } from "react-native";

import type { FieldDefinition, FieldValue } from "../../lib/forms/types";
import { FieldRenderer } from "./FieldRenderer";
import { formStyles } from "./FormStyles";

interface Props {
  title?: string;
  fields: FieldDefinition[];
  values: Record<string, FieldValue>;
  errors: Record<string, string>;
  onChange: (fieldName: string, value: FieldValue) => void;
  editable: boolean;
}

export function FieldSectionRenderer({
  title,
  fields,
  values,
  errors,
  onChange,
  editable,
}: Props) {
  return (
    <View style={formStyles.section}>
      {title ? <Text style={formStyles.sectionTitle}>{title}</Text> : null}
      {fields.map((field) => (
        <FieldRenderer
          key={field.name}
          field={field}
          value={values[field.name]}
          error={errors[field.name]}
          onChange={(value) => onChange(field.name, value)}
          editable={editable && field.editable}
        />
      ))}
    </View>
  );
}
