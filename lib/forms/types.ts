import type { BlockTypeSchema, StreamFieldBlock } from "../types";

export type FormMode = "create" | "edit";

export type FieldKind =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "richText"
  | "imageChooser"
  | "pageChooser"
  | "inlinePanel"
  | "streamField"
  | "readOnly";

export type FieldSection =
  | "identity"
  | "fields"
  | "richText"
  | "media"
  | "inlinePanels"
  | "streamFields"
  | "content";

export type TextInputType = "text" | "url" | "email";
export type NumberInputType = "integer" | "float";

export type InlinePanelItemValue = Record<string, FieldValue> & {
  id?: number | null;
  sort_order?: number | null;
};

export type FieldValue =
  | string
  | number
  | boolean
  | null
  | StreamFieldBlock[]
  | InlinePanelItemValue[]
  | Record<string, unknown>;

interface BaseFieldDefinition {
  name: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  nullable: boolean;
  editable: boolean;
  section: FieldSection;
}

export interface TextFieldDefinition extends BaseFieldDefinition {
  kind: "text";
  schemaMeta: {
    inputType: TextInputType;
    enum?: string[];
  };
}

export interface NumberFieldDefinition extends BaseFieldDefinition {
  kind: "number";
  schemaMeta: {
    numberType: NumberInputType;
  };
}

export interface BooleanFieldDefinition extends BaseFieldDefinition {
  kind: "boolean";
  schemaMeta: {};
}

export interface DateFieldDefinition extends BaseFieldDefinition {
  kind: "date" | "datetime";
  schemaMeta: {};
}

export interface RichTextFieldDefinition extends BaseFieldDefinition {
  kind: "richText";
  schemaMeta: {};
}

export interface ChooserFieldDefinition extends BaseFieldDefinition {
  kind: "imageChooser" | "pageChooser";
  schemaMeta: {};
}

export interface InlinePanelFieldDefinition extends BaseFieldDefinition {
  kind: "inlinePanel";
  schemaMeta: {
    fields: ChildFieldDefinition[];
  };
}

export interface StreamFieldDefinition extends BaseFieldDefinition {
  kind: "streamField";
  schemaMeta: {
    blockTypes: BlockTypeSchema[];
  };
}

export interface ReadOnlyFieldDefinition extends BaseFieldDefinition {
  kind: "readOnly";
  schemaMeta: {
    message?: string;
  };
}

export type FieldDefinition =
  | TextFieldDefinition
  | NumberFieldDefinition
  | BooleanFieldDefinition
  | DateFieldDefinition
  | RichTextFieldDefinition
  | ChooserFieldDefinition
  | InlinePanelFieldDefinition
  | StreamFieldDefinition
  | ReadOnlyFieldDefinition;

export type ChildFieldDefinition = Exclude<
  FieldDefinition,
  InlinePanelFieldDefinition | StreamFieldDefinition
>;

export interface FormState {
  fields: FieldDefinition[];
  values: Record<string, FieldValue>;
  initialValues: Record<string, FieldValue>;
  dirty: Record<string, boolean>;
  errors: Record<string, string>;
}
