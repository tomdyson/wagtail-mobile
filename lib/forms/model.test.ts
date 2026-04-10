import test from "node:test";
import assert from "node:assert/strict";

import type { SchemaDetail } from "../api";
import type { PageDetail, StreamFieldBlock } from "../types";
import {
  buildCreateFormModel,
  buildEditFormModel,
  getSectionedFields,
  serializeCreatePayload,
  serializeEditPayload,
  updateFieldValue,
  validateForm,
} from "./model";
import type { InlinePanelItemValue } from "./types";

const schemaDetail: SchemaDetail = {
  type: "testapp.ArticlePage",
  create_schema: {
    properties: {
      title: { type: "string" },
      slug: { type: "string" },
      rating: { type: "integer" },
      featured: { type: "boolean" },
      published_on: { type: "string", format: "date" },
      publish_at: { type: "string", format: "date-time" },
      summary: { type: "string" },
      body: { type: "string" },
      hero_image: { type: "integer", widget: "image_chooser" },
      related_page: { type: "integer", widget: "page_chooser" },
      gallery: {
        type: "array",
        items: { $ref: "#/$defs/GalleryItem" },
      },
      content: { type: "array" },
      config: {
        type: "object",
        properties: {
          theme: { type: "string" },
        },
      },
    },
    required: ["title"],
    $defs: {
      GalleryItem: {
        type: "object",
        properties: {
          id: { type: "integer" },
          caption: { type: "string" },
          weight: { type: "integer" },
          visible: { type: "boolean" },
        },
        required: ["caption"],
      },
    },
  } as SchemaDetail["create_schema"] & { $defs: Record<string, unknown> },
  streamfield_blocks: {
    content: [
      {
        type: "paragraph",
        schema: {
          type: "richtext",
        },
      },
    ],
  },
  richtext_fields: ["body"],
};

const page: PageDetail = {
  id: 12,
  title: "Example article",
  slug: "example-article",
  rating: 5,
  featured: true,
  published_on: "2026-04-10",
  publish_at: "2026-04-10T09:30:00.000Z",
  summary: "Intro",
  body: "Existing body",
  hero_image: 42,
  related_page: 99,
  gallery: [
    {
      id: 1,
      caption: "Cover",
      weight: 10,
      visible: true,
      sort_order: 3,
    },
  ],
  content: [
    {
      id: "block-1",
      type: "paragraph",
      value: "Hello world",
    },
  ],
  config: { theme: "light" },
  meta: {
    type: "testapp.ArticlePage",
    live: true,
    has_unpublished_changes: false,
    parent_id: 1,
    url_path: "/articles/example-article/",
    first_published_at: "2026-04-10T09:30:00.000Z",
    last_published_at: "2026-04-10T09:30:00.000Z",
    children_count: 0,
    user_permissions: ["change", "publish", "delete"],
  },
};

test("buildCreateFormModel creates typed definitions and ordered sections", () => {
  const form = buildCreateFormModel(schemaDetail);
  const fieldsByName = new Map(form.fields.map((field) => [field.name, field]));

  assert.equal(fieldsByName.get("title")?.kind, "text");
  assert.equal(fieldsByName.get("rating")?.kind, "number");
  assert.equal(fieldsByName.get("featured")?.kind, "boolean");
  assert.equal(fieldsByName.get("published_on")?.kind, "date");
  assert.equal(fieldsByName.get("publish_at")?.kind, "datetime");
  assert.equal(fieldsByName.get("body")?.kind, "richText");
  assert.equal(fieldsByName.get("hero_image")?.kind, "imageChooser");
  assert.equal(fieldsByName.get("related_page")?.kind, "pageChooser");
  assert.equal(fieldsByName.get("gallery")?.kind, "inlinePanel");
  assert.equal(fieldsByName.get("content")?.kind, "streamField");
  assert.equal(fieldsByName.get("config")?.kind, "readOnly");

  const sections = getSectionedFields(form.fields);
  assert.equal(sections[0]?.section, "identity");
  assert.ok(sections.some((section) => section.section === "streamFields"));
});

test("buildEditFormModel preserves page values and shared kinds", () => {
  const form = buildEditFormModel(page, schemaDetail);

  assert.equal(form.values.rating, 5);
  assert.equal(form.values.featured, true);
  assert.equal(form.values.published_on, "2026-04-10");
  assert.deepEqual(form.values.gallery, page.gallery);
  assert.deepEqual(form.values.content, page.content);
});

test("create payload omits untouched optional empties and preserves typed values", () => {
  let form = buildCreateFormModel(schemaDetail);
  form = updateFieldValue(form, "title", "New article");
  form = updateFieldValue(form, "rating", 7);
  form = updateFieldValue(form, "featured", true);
  form = updateFieldValue(form, "published_on", "2026-04-10");
  form = updateFieldValue(form, "hero_image", 15);

  const galleryItem: InlinePanelItemValue = {
    id: null,
    caption: "Gallery item",
    weight: 2,
    visible: true,
  };
  form = updateFieldValue(form, "gallery", [galleryItem]);

  const blocks: StreamFieldBlock[] = [
    {
      id: "block-1",
      type: "paragraph",
      value: "Hello world",
    },
  ];
  form = updateFieldValue(form, "content", blocks);

  const payload = serializeCreatePayload(form, {
    type: "testapp.ArticlePage",
    parent: 1,
  });

  assert.equal(payload.title, "New article");
  assert.equal(payload.rating, 7);
  assert.equal(payload.featured, true);
  assert.equal(payload.published_on, "2026-04-10");
  assert.equal(payload.hero_image, 15);
  assert.equal(payload.summary, undefined);
  assert.deepEqual(payload.gallery, [galleryItem]);
  assert.deepEqual(payload.content, [
    {
      id: "block-1",
      type: "paragraph",
      value: {
        format: "markdown",
        content: "Hello world",
      },
    },
  ]);
});

test("edit payload includes only dirty fields and clears optional values to null", () => {
  let form = buildEditFormModel(page, schemaDetail);
  form = updateFieldValue(form, "summary", "");
  form = updateFieldValue(form, "published_on", null);
  form = updateFieldValue(form, "rating", 8);
  form = updateFieldValue(form, "gallery", []);

  const payload = serializeEditPayload(form);

  assert.deepEqual(payload, {
    summary: null,
    published_on: null,
    rating: 8,
    gallery: [],
  });
});

test("edit payload strips inline panel sort_order and wraps rich text", () => {
  let form = buildEditFormModel(page, schemaDetail);
  form = updateFieldValue(form, "body", "Updated body");
  form = updateFieldValue(form, "gallery", [
    {
      id: 1,
      caption: "Updated caption",
      weight: 12,
      visible: false,
      sort_order: 99,
    },
  ]);

  const payload = serializeEditPayload(form);

  assert.deepEqual(payload.body, {
    format: "markdown",
    content: "Updated body",
  });
  assert.deepEqual(payload.gallery, [
    {
      id: 1,
      caption: "Updated caption",
      weight: 12,
      visible: false,
    },
  ]);
});

test("validation enforces obvious required fields", () => {
  let form = buildCreateFormModel(schemaDetail);
  let errors = validateForm(form, "create");
  assert.equal(errors.title, "Title is required");

  form = updateFieldValue(form, "title", "Ready");
  errors = validateForm(form, "create");
  assert.equal(errors.title, undefined);
});
