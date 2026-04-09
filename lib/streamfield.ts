import type { BlockSchema, BlockTypeSchema, StreamFieldBlock } from "./types";
import { markdownPayload } from "./richtext";

const EDITABLE_TYPES = new Set([
  "string",
  "richtext",
  "integer",
  "float",
  "boolean",
  "date",
  "datetime",
  "url",
  "email",
  "image_chooser",
  "page_chooser",
]);

export function isBlockEditable(schema: BlockSchema): boolean {
  if (EDITABLE_TYPES.has(schema.type)) return true;
  if (schema.type === "string" && schema.enum) return true;
  if (schema.type === "object" && schema.properties) {
    return Object.values(schema.properties).every((child) =>
      isBlockEditable(child)
    );
  }
  if (schema.type === "array" && schema.items) {
    return isBlockEditable(schema.items);
  }
  return false;
}

export function defaultValueForBlock(schema: BlockSchema): unknown {
  switch (schema.type) {
    case "string":
    case "richtext":
    case "url":
    case "email":
      return schema.enum ? schema.enum[0] : "";
    case "integer":
    case "float":
      return 0;
    case "boolean":
      return false;
    case "date":
    case "datetime":
      return new Date().toISOString().split("T")[0];
    case "object":
      if (!schema.properties) return {};
      return Object.fromEntries(
        Object.entries(schema.properties).map(([key, child]) => [
          key,
          defaultValueForBlock(child),
        ])
      );
    case "array":
      return [];
    default:
      return null;
  }
}

export function generateBlockId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function findBlockSchema(
  blockType: string,
  blockTypes: BlockTypeSchema[]
): BlockSchema | null {
  return blockTypes.find((bt) => bt.type === blockType)?.schema ?? null;
}

function prepareStructForSave(
  value: Record<string, unknown>,
  schema: BlockSchema
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    const childSchema = schema.properties?.[key];
    if (childSchema?.type === "richtext" && typeof val === "string") {
      result[key] = markdownPayload(val);
    } else if (
      childSchema?.type === "object" &&
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val)
    ) {
      result[key] = prepareStructForSave(
        val as Record<string, unknown>,
        childSchema
      );
    } else {
      result[key] = val;
    }
  }
  return result;
}

function prepareValueForSave(value: unknown, schema: BlockSchema): unknown {
  if (schema.type === "richtext" && typeof value === "string") {
    return markdownPayload(value);
  }
  if (
    schema.type === "object" &&
    schema.properties &&
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return prepareStructForSave(value as Record<string, unknown>, schema);
  }
  if (schema.type === "array" && schema.items && Array.isArray(value)) {
    return value.map((item) => prepareValueForSave(item, schema.items!));
  }
  return value;
}

export function prepareBlocksForSave(
  blocks: StreamFieldBlock[],
  blockTypes: BlockTypeSchema[]
): StreamFieldBlock[] {
  return blocks.map((block) => {
    const schema = findBlockSchema(block.type, blockTypes);
    if (!schema) return block;

    return { ...block, value: prepareValueForSave(block.value, schema) };
  });
}
