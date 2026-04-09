import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PageListItem } from "../lib/types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  page: PageListItem;
  onDrillDown: () => void;
  onDetail: () => void;
}

function shortType(type: string): string {
  const parts = type.split(".");
  return parts[parts.length - 1]
    .replace(/([A-Z])/g, " $1")
    .trim();
}

export function PageRow({ page, onDrillDown, onDetail }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.content, pressed && styles.contentPressed]}
        onPress={onDetail}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {page.title}
          </Text>
          <StatusBadge
            live={page.meta.live}
            hasUnpublishedChanges={page.meta.has_unpublished_changes}
          />
        </View>
        <Text style={styles.type} numberOfLines={1}>
          {shortType(page.meta.type)}
        </Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.chevron,
          pressed && styles.chevronPressed,
        ]}
        onPress={onDrillDown}
        hitSlop={{ top: 12, bottom: 12, right: 8 }}
      >
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  content: {
    flex: 1,
    gap: 2,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  contentPressed: {
    backgroundColor: "#F9FAFB",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
  },
  type: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  chevron: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  chevronPressed: {
    opacity: 0.4,
  },
});
