import type { SchemaDetail } from "../api";
import { markdownPayload } from "../richtext";
import { prepareBlocksForSave } from "../streamfield";
import type { PageDetail, StreamFieldBlock } from "../types";
import type {
  ChildFieldDefinition,
  FieldDefinition,
  FieldSection,
  FieldValue,
  FormMode,
  FormState,
  InlinePanelItemValue,
  NumberFieldDefinition,
  TextFieldDefinition,
} from "./types";

const SKIP_CREATE_FIELDS = new Set([
  "type",
  "parent",
  "action",
  "title",
  "slug",
  "alias_of",
  "id",
]);

const SKIP_EDIT_FIELDS = new Set([
  "id",
  "title",
  "slug",
  "meta",
  "hints",
  "alias_of",
]);

const SECTION_ORDER: FieldSection[] = [
  "identity",
  "fields",
  "richText",
  "media",
  "inlinePanels",
  "streamFields",
  "content",
];

function humanize(name: string): string {
  return name.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function normalizeFieldValue(value: FieldValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === "object" && item !== null
        ? normalizeObject(item as Record<string, unknown>)
        : item
    );
  }

  if (typeof value === "object" && value !== null) {
    return normalizeObject(value);
  }

  return value;
}

function normalizeObject(
  value: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      normalizeFieldValue(entry as FieldValue),
    ])
  );
}

function areValuesEqual(left: FieldValue, right: FieldValue): boolean {
  return JSON.stringify(normalizeFieldValue(left)) === JSON.stringify(normalizeFieldValue(right));
}

function allowsNull(definition: Record<string, unknown>): boolean {
  if (definition.type === "null") return true;

  if (Array.isArray(definition.anyOf)) {
    return definition.anyOf.some((option) => {
      const typedOption = option as Record<string, unknown>;
      return typedOption.type === "null";
    });
  }

  return false;
}

function getPrimarySchemaType(definition: Record<string, unknown>): string | null {
  if (typeof definition.type === "string") {
    return definition.type;
  }

  if (Array.isArray(definition.anyOf)) {
    const option = definition.anyOf.find((entry) => {
      const typedEntry = entry as Record<string, unknown>;
      return typedEntry.type && typedEntry.type !== "null";
    }) as Record<string, unknown> | undefined;

    if (typeof option?.type === "string") {
      return option.type;
    }
  }

  return null;
}

function getSchemaFormat(definition: Record<string, unknown>): string | null {
  if (typeof definition.format === "string") {
    return definition.format;
  }

  if (Array.isArray(definition.anyOf)) {
    const option = definition.anyOf.find((entry) => {
      const typedEntry = entry as Record<string, unknown>;
      return typeof typedEntry.format === "string";
    }) as Record<string, unknown> | undefined;

    if (typeof option?.format === "string") {
      return option.format;
    }
  }

  return null;
}

function createBaseDefinition(
  name: string,
  section: FieldSection,
  required: boolean,
  nullable: boolean
): Omit<FieldDefinition, "kind" | "schemaMeta"> {
  return {
    name,
    label: humanize(name),
    required,
    nullable,
    editable: true,
    section,
  };
}

function createTextDefinition(
  name: string,
  section: FieldSection,
  required: boolean,
  nullable: boolean,
  inputType: TextFieldDefinition["schemaMeta"]["inputType"] = "text",
  choices?: string[]
): TextFieldDefinition {
  return {
    ...createBaseDefinition(name, section, required, nullable),
    kind: "text",
    schemaMeta: choices && choices.length > 0 ? { inputType, enum: choices } : { inputType },
  };
}

function createNumberDefinition(
  name: string,
  section: FieldSection,
  required: boolean,
  nullable: boolean,
  numberType: NumberFieldDefinition["schemaMeta"]["numberType"]
): NumberFieldDefinition {
  return {
    ...createBaseDefinition(name, section, required, nullable),
    kind: "number",
    schemaMeta: { numberType },
  };
}

function createIdentityDefinitions(): FieldDefinition[] {
  return [
    createTextDefinition("title", "identity", true, false),
    createTextDefinition("slug", "identity", false, true),
  ];
}

function definitionFromSchemaNode(
  name: string,
  definition: Record<string, unknown>,
  required: boolean,
  richTextFields: Set<string>,
  streamfieldBlocks: Record<string, NonNullable<SchemaDetail["streamfield_blocks"]>[string]>,
  defs: Record<string, Record<string, unknown>> | undefined
): FieldDefinition {
  const nullable = allowsNull(definition) || !required;
  const widget = typeof definition.widget === "string" ? definition.widget : null;
  const primaryType = getPrimarySchemaType(definition);
  const format = getSchemaFormat(definition);

  if (richTextFields.has(name)) {
    return {
      ...createBaseDefinition(name, "richText", required, nullable),
      kind: "richText",
      schemaMeta: {},
    };
  }

  if (streamfieldBlocks[name]) {
    return {
      ...createBaseDefinition(name, "streamFields", required, nullable),
      kind: "streamField",
      schemaMeta: { blockTypes: streamfieldBlocks[name] },
    };
  }

  if (primaryType === "array" && definition.items && defs) {
    const items = definition.items as Record<string, unknown>;
    const ref = typeof items.$ref === "string" ? items.$ref : null;
    if (ref?.startsWith("#/$defs/")) {
      const defName = ref.replace("#/$defs/", "");
      const childDefinition = defs[defName];
      const childProperties = childDefinition?.properties as
        | Record<string, Record<string, unknown>>
        | undefined;
      if (childProperties) {
        const childRequired = new Set((childDefinition.required as string[]) || []);
        const childFields = Object.entries(childProperties)
          .filter(([childName]) => childName !== "id" && childName !== "sort_order")
          .map(([childName, childSchema]) =>
            definitionFromSchemaNode(
              childName,
              childSchema,
              childRequired.has(childName),
              new Set<string>(),
              {},
              defs
            )
          )
          .filter(
            (field): field is ChildFieldDefinition =>
              field.kind !== "streamField" && field.kind !== "inlinePanel"
          );

        return {
          ...createBaseDefinition(name, "inlinePanels", required, nullable),
          kind: "inlinePanel",
          schemaMeta: { fields: childFields },
        };
      }
    }
  }

  if (widget === "image_chooser") {
    return {
      ...createBaseDefinition(name, "media", required, nullable),
      kind: "imageChooser",
      schemaMeta: {},
    };
  }

  if (widget === "page_chooser") {
    return {
      ...createBaseDefinition(name, "media", required, nullable),
      kind: "pageChooser",
      schemaMeta: {},
    };
  }

  if (format === "date") {
    return {
      ...createBaseDefinition(name, "fields", required, nullable),
      kind: "date",
      schemaMeta: {},
    };
  }

  if (format === "date-time") {
    return {
      ...createBaseDefinition(name, "fields", required, nullable),
      kind: "datetime",
      schemaMeta: {},
    };
  }

  if (primaryType === "boolean") {
    return {
      ...createBaseDefinition(name, "fields", required, nullable),
      kind: "boolean",
      schemaMeta: {},
    };
  }

  if (primaryType === "integer" || primaryType === "number") {
    return createNumberDefinition(
      name,
      "fields",
      required,
      nullable,
      primaryType === "integer" ? "integer" : "float"
    );
  }

  if (
    primaryType === "string" ||
    primaryType === "null" ||
    primaryType === "array" ||
    primaryType === "object"
  ) {
    if (primaryType === "string" || primaryType === "null") {
      const enumChoices = Array.isArray(definition.enum)
        ? definition.enum.filter((choice): choice is string => typeof choice === "string")
        : undefined;
      const inputType =
        primaryType === "string" && format === "uri"
          ? "url"
          : primaryType === "string" && format === "email"
            ? "email"
            : "text";

      return createTextDefinition(name, "fields", required, nullable, inputType, enumChoices);
    }
  }

  return {
    ...createBaseDefinition(name, "content", required, nullable),
    kind: "readOnly",
    schemaMeta: { message: "Unsupported field type" },
  };
}

function getDefaultValue(field: FieldDefinition): FieldValue {
  switch (field.kind) {
    case "text":
      return field.schemaMeta.enum?.[0] ?? "";
    case "richText":
      return "";
    case "number":
      return null;
    case "boolean":
      return false;
    case "date":
    case "datetime":
    case "imageChooser":
    case "pageChooser":
      return null;
    case "inlinePanel":
    case "streamField":
      return [];
    case "readOnly":
      return null;
  }
}

function buildInitialValues(
  fields: FieldDefinition[],
  sourceValues?: Record<string, unknown>
): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};

  for (const field of fields) {
    const sourceValue = sourceValues?.[field.name];
    if (sourceValue === undefined) {
      values[field.name] = getDefaultValue(field);
      continue;
    }

    if (field.kind === "inlinePanel" && Array.isArray(sourceValue)) {
      values[field.name] = sourceValue as InlinePanelItemValue[];
      continue;
    }

    if (field.kind === "streamField" && Array.isArray(sourceValue)) {
      values[field.name] = sourceValue as FieldValue;
      continue;
    }

    values[field.name] = sourceValue as FieldValue;
  }

  return values;
}

function baseFormState(
  fields: FieldDefinition[],
  values: Record<string, FieldValue>
): FormState {
  return {
    fields,
    values,
    initialValues: values,
    dirty: {},
    errors: {},
  };
}

function orderedDefinitions(definitions: FieldDefinition[]): FieldDefinition[] {
  return definitions.sort(
    (left, right) =>
      SECTION_ORDER.indexOf(left.section) - SECTION_ORDER.indexOf(right.section)
  );
}

function schemaDefinitions(schemaDetail: SchemaDetail): FieldDefinition[] {
  const props = schemaDetail.create_schema.properties;
  const required = new Set(schemaDetail.create_schema.required || []);
  const richTextFields = new Set(schemaDetail.richtext_fields || []);
  const streamfieldBlocks = schemaDetail.streamfield_blocks || {};
  const defs = (schemaDetail.create_schema as Record<string, unknown>)["$defs"] as
    | Record<string, Record<string, unknown>>
    | undefined;

  return Object.entries(props)
    .filter(([name]) => !SKIP_CREATE_FIELDS.has(name))
    .map(([name, definition]) =>
      definitionFromSchemaNode(
        name,
        definition as Record<string, unknown>,
        required.has(name),
        richTextFields,
        streamfieldBlocks,
        defs
      )
    );
}

function runtimeReadOnlyDefinition(name: string): FieldDefinition {
  return {
    ...createBaseDefinition(name, "content", false, true),
    kind: "readOnly",
    schemaMeta: {},
  };
}

function editDefinitions(
  page: PageDetail,
  schemaDetail: SchemaDetail | null
): FieldDefinition[] {
  const definitions: FieldDefinition[] = createIdentityDefinitions();
  const schemaMap = new Map<string, FieldDefinition>();

  if (schemaDetail) {
    for (const definition of schemaDefinitions(schemaDetail)) {
      schemaMap.set(definition.name, definition);
    }
  }

  for (const [name, value] of Object.entries(page)) {
    if (SKIP_EDIT_FIELDS.has(name)) continue;

    const definition = schemaMap.get(name);
    if (definition) {
      definitions.push(definition);
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      definitions.push(
        typeof value === "number"
          ? createNumberDefinition(name, "fields", false, true, "float")
          : typeof value === "boolean"
            ? {
                ...createBaseDefinition(name, "fields", false, true),
                kind: "boolean",
                schemaMeta: {},
              }
            : createTextDefinition(name, "fields", false, true)
      );
      continue;
    }

    definitions.push(runtimeReadOnlyDefinition(name));
  }

  return orderedDefinitions(definitions);
}

function createDefinitions(schemaDetail: SchemaDetail): FieldDefinition[] {
  return orderedDefinitions([...createIdentityDefinitions(), ...schemaDefinitions(schemaDetail)]);
}

function isTextLikeField(field: FieldDefinition): boolean {
  return (
    field.kind === "text" ||
    field.kind === "richText" ||
    field.kind === "date" ||
    field.kind === "datetime"
  );
}

function isEmptyValue(field: FieldDefinition, value: FieldValue): boolean {
  switch (field.kind) {
    case "text":
    case "richText":
    case "date":
    case "datetime":
      return value === null || value === "";
    case "number":
      return value === null;
    case "boolean":
      return value === null;
    case "imageChooser":
    case "pageChooser":
      return value === null;
    case "inlinePanel":
    case "streamField":
      return Array.isArray(value) && value.length === 0;
    case "readOnly":
      return true;
  }
}

function serializeInlinePanelItems(
  items: InlinePanelItemValue[],
  field: Extract<FieldDefinition, { kind: "inlinePanel" }>
): InlinePanelItemValue[] {
  return items.map((item) => {
    const result: InlinePanelItemValue = {};

    if ("id" in item) {
      result.id = item.id ?? null;
    }

    for (const childField of field.schemaMeta.fields) {
      const childValue = item[childField.name];
      if (childValue === undefined) continue;

      const serialized = serializeFieldValue(childField, childValue, "edit");
      if (serialized !== undefined) {
        result[childField.name] = serialized as FieldValue;
      }
    }

    return result;
  });
}

function serializeFieldValue(
  field: FieldDefinition,
  value: FieldValue,
  mode: FormMode
): unknown {
  switch (field.kind) {
    case "text":
      if (value === null || value === "") {
        return mode === "edit" ? null : undefined;
      }
      return value;
    case "number":
      return value === null ? (mode === "edit" ? null : undefined) : value;
    case "boolean":
      return value;
    case "date":
    case "datetime":
      if (value === null || value === "") {
        return mode === "edit" ? null : undefined;
      }
      return value;
    case "richText":
      if (value === null || value === "") {
        return mode === "edit" ? null : undefined;
      }
      return markdownPayload(String(value));
    case "imageChooser":
    case "pageChooser":
      return value === null ? (mode === "edit" ? null : undefined) : value;
    case "inlinePanel":
      return serializeInlinePanelItems(
        Array.isArray(value) ? (value as InlinePanelItemValue[]) : [],
        field
      );
    case "streamField":
      return Array.isArray(value)
        ? prepareBlocksForSave(value as StreamFieldBlock[], field.schemaMeta.blockTypes)
        : [];
    case "readOnly":
      return undefined;
  }
}

function validateInlinePanelField(
  field: Extract<FieldDefinition, { kind: "inlinePanel" }>,
  items: InlinePanelItemValue[]
): string | undefined {
  if (field.required && items.length === 0) {
    return `${field.label} is required`;
  }

  for (const item of items) {
    for (const childField of field.schemaMeta.fields) {
      if (!childField.required) continue;
      const childValue = item[childField.name] as FieldValue;
      if (isEmptyValue(childField, childValue ?? null)) {
        return `${field.label} has missing required fields`;
      }
    }
  }

  return undefined;
}

export function buildCreateFormModel(schemaDetail: SchemaDetail): FormState {
  const fields = createDefinitions(schemaDetail);
  return baseFormState(fields, buildInitialValues(fields));
}

export function buildEditFormModel(
  page: PageDetail,
  schemaDetail: SchemaDetail | null
): FormState {
  const fields = editDefinitions(page, schemaDetail);
  const sourceValues: Record<string, unknown> = {
    ...page,
    title: page.title,
    slug: page.slug,
  };
  return baseFormState(fields, buildInitialValues(fields, sourceValues));
}

export function updateFieldValue(
  formState: FormState,
  fieldName: string,
  nextValue: FieldValue
): FormState {
  const dirty = !areValuesEqual(nextValue, formState.initialValues[fieldName]);
  const nextErrors = { ...formState.errors };
  delete nextErrors[fieldName];

  return {
    ...formState,
    values: {
      ...formState.values,
      [fieldName]: nextValue,
    },
    dirty: dirty
      ? { ...formState.dirty, [fieldName]: true }
      : Object.fromEntries(
          Object.entries(formState.dirty).filter(([key]) => key !== fieldName)
        ),
    errors: nextErrors,
  };
}

export function setFormErrors(
  formState: FormState,
  errors: Record<string, string>
): FormState {
  return {
    ...formState,
    errors,
  };
}

export function validateForm(
  formState: FormState,
  _mode: FormMode
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of formState.fields) {
    const value = formState.values[field.name];

    if (field.kind === "readOnly") {
      continue;
    }

    if (field.kind === "inlinePanel") {
      const error = validateInlinePanelField(
        field,
        Array.isArray(value) ? (value as InlinePanelItemValue[]) : []
      );
      if (error) {
        errors[field.name] = error;
      }
      continue;
    }

    if (field.required && isEmptyValue(field, value)) {
      errors[field.name] = `${field.label} is required`;
    }
  }

  return errors;
}

export function serializeCreatePayload(
  formState: FormState,
  baseData: Record<string, unknown>
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...baseData };

  for (const field of formState.fields) {
    const value = formState.values[field.name];
    if (field.kind === "readOnly") continue;

    if (!field.required && isEmptyValue(field, value)) {
      continue;
    }

    if (field.kind === "boolean" && !formState.dirty[field.name] && value === false) {
      continue;
    }

    const serialized = serializeFieldValue(field, value, "create");
    if (serialized !== undefined) {
      payload[field.name] = serialized;
    }
  }

  return payload;
}

export function serializeEditPayload(formState: FormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of formState.fields) {
    if (!formState.dirty[field.name]) continue;

    const serialized = serializeFieldValue(field, formState.values[field.name], "edit");
    if (serialized !== undefined) {
      payload[field.name] = serialized;
    }
  }

  return payload;
}

export function hasDirtyFields(formState: FormState): boolean {
  return Object.keys(formState.dirty).length > 0;
}

export function getSectionedFields(
  fields: FieldDefinition[]
): Array<{ section: FieldSection; fields: FieldDefinition[] }> {
  return SECTION_ORDER.map((section) => ({
    section,
    fields: fields.filter((field) => field.section === section),
  })).filter((entry) => entry.fields.length > 0);
}

export function getDefaultFieldValue(field: FieldDefinition): FieldValue {
  return getDefaultValue(field);
}

export function getTextValue(value: FieldValue): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function getBooleanValue(value: FieldValue): boolean {
  return Boolean(value);
}

export function isNumberField(field: FieldDefinition): field is NumberFieldDefinition {
  return field.kind === "number";
}

export function isTextField(field: FieldDefinition): field is TextFieldDefinition {
  return field.kind === "text";
}

export function isTextLike(field: FieldDefinition): boolean {
  return isTextLikeField(field);
}
