import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDateDisplay,
  parseDateValue,
  serializePickedDate,
} from "./date";

test("date-only values round-trip without UTC drift", () => {
  const parsed = parseDateValue("2026-04-10", "date");
  assert.ok(parsed);
  assert.equal(serializePickedDate(parsed, "date"), "2026-04-10");
});

test("datetime values remain ISO timestamps", () => {
  const parsed = parseDateValue("2026-04-10T09:30:00.000Z", "datetime");
  assert.ok(parsed);
  assert.equal(
    serializePickedDate(parsed, "datetime"),
    "2026-04-10T09:30:00.000Z"
  );
});

test("display formatting preserves canonical date strings", () => {
  assert.notEqual(formatDateDisplay("2026-04-10", "date"), "Not set");
});
