import { StyleSheet } from "react-native";

export const formStyles = StyleSheet.create({
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  required: {
    color: "#EF4444",
  },
  fieldInput: {
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
  errorText: {
    fontSize: 13,
    color: "#EF4444",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 16,
    color: "#111827",
  },
  viewOnly: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  readOnlyValue: {
    fontSize: 14,
    color: "#6B7280",
    paddingVertical: 4,
    fontFamily: "monospace",
  },
});
