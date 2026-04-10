function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function isCanonicalDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseDateValue(
  value: string | null,
  mode: "date" | "datetime"
): Date | null {
  if (!value) return null;

  if (mode === "date" && isCanonicalDate(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateDisplay(
  value: string | null,
  mode: "date" | "datetime"
): string {
  if (!value) return "Not set";

  const date = parseDateValue(value, mode);
  if (!date) return value;

  if (mode === "date") {
    return date.toLocaleDateString();
  }

  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function serializePickedDate(
  date: Date,
  mode: "date" | "datetime"
): string {
  if (mode === "date") {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  }

  return date.toISOString();
}
