import { StyleSheet, Text, View } from "react-native";

interface Props {
  value: unknown;
  schemaType: string;
}

function formatValue(value: unknown, schemaType: string): string {
  if (schemaType === "image_chooser" && typeof value === "number") {
    return `Image #${value}`;
  }
  if (schemaType === "page_chooser" && typeof value === "number") {
    return `Page #${value}`;
  }
  if (value === null || value === undefined) return "Not set";
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export function ReadOnlyBlock({ value, schemaType }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.value} numberOfLines={6}>
        {formatValue(value, schemaType)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
  },
  value: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "monospace",
  },
});
