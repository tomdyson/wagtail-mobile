import { StyleSheet, Text, View } from "react-native";

interface Props {
  live: boolean;
  hasUnpublishedChanges: boolean;
}

export function StatusBadge({ live, hasUnpublishedChanges }: Props) {
  let color: string;
  let label: string;

  if (live && hasUnpublishedChanges) {
    color = "#F59E0B";
    label = "Draft changes";
  } else if (live) {
    color = "#10B981";
    label = "Live";
  } else {
    color = "#9CA3AF";
    label = "Draft";
  }

  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
