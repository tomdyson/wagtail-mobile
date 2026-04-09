import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { pages } from "../../lib/api";
import { useAuth } from "../../lib/hooks/useAuth";
import type { PageListItem } from "../../lib/types";
import { StatusBadge } from "../StatusBadge";

interface Props {
  value: unknown;
  onChange: (pageId: number | null) => void;
  editable: boolean;
}

export function PageChooser({ value, onChange, editable }: Props) {
  const { baseUrl, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<{ title: string; type: string } | null>(
    null
  );

  // Fetch current page preview
  useEffect(() => {
    if (typeof value === "number" && value > 0) {
      pages
        .get(baseUrl, token, value)
        .then((p) => setPreview({ title: p.title, type: p.meta.type }))
        .catch(() => setPreview(null));
    } else {
      setPreview(null);
    }
  }, [value, baseUrl, token]);

  const shortType = preview
    ? preview.type
        .split(".")
        .pop()
        ?.replace(/([A-Z])/g, " $1")
        .trim()
    : null;

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.selector,
          pressed && editable && styles.selectorPressed,
          !editable && styles.selectorDisabled,
        ]}
        onPress={() => editable && setOpen(true)}
        disabled={!editable}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={20} color="#9CA3AF" />
        </View>
        <View style={styles.selectorInfo}>
          <Text style={styles.selectorTitle} numberOfLines={1}>
            {preview ? preview.title : value ? `Page #${value}` : "Choose page"}
          </Text>
          {shortType && <Text style={styles.selectorMeta}>{shortType}</Text>}
        </View>
        {editable && (
          <View style={styles.selectorActions}>
            {value != null && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </Pressable>
            )}
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet">
        <PagePickerModal
          baseUrl={baseUrl}
          token={token}
          onSelect={(id) => {
            onChange(id);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      </Modal>
    </View>
  );
}

function PagePickerModal({
  baseUrl,
  token,
  onSelect,
  onClose,
}: {
  baseUrl: string;
  token: string;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<PageListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const filters = search
        ? { search, limit: 30 }
        : { limit: 30 };
      const result = await pages.list(baseUrl, token, filters);
      setItems(result.items);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, search]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  function shortType(type: string): string {
    return (
      type
        .split(".")
        .pop()
        ?.replace(/([A-Z])/g, " $1")
        .trim() || type
    );
  }

  return (
    <SafeAreaView style={modalStyles.container}>
      <View style={modalStyles.header}>
        <Text style={modalStyles.title}>Choose Page</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Text style={modalStyles.cancel}>Cancel</Text>
        </Pressable>
      </View>
      <View style={modalStyles.searchContainer}>
        <Ionicons
          name="search"
          size={16}
          color="#9CA3AF"
          style={modalStyles.searchIcon}
        />
        <TextInput
          style={modalStyles.searchInput}
          placeholder="Search pages..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={modalStyles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              modalStyles.row,
              pressed && modalStyles.rowPressed,
            ]}
            onPress={() => onSelect(item.id)}
          >
            <View style={modalStyles.rowContent}>
              <View style={modalStyles.titleRow}>
                <Text style={modalStyles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <StatusBadge
                  live={item.meta.live}
                  hasUnpublishedChanges={item.meta.has_unpublished_changes}
                />
              </View>
              <Text style={modalStyles.rowType}>{shortType(item.meta.type)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={modalStyles.empty}>
              <Text style={modalStyles.emptyText}>
                {search ? "No pages found" : "No pages"}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#FAFAFA",
    gap: 10,
  },
  selectorPressed: {
    backgroundColor: "#F3F4F6",
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  selectorInfo: {
    flex: 1,
    gap: 1,
  },
  selectorTitle: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },
  selectorMeta: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  selectorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  cancel: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "500",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
  },
  list: {
    paddingBottom: 40,
  },
  row: {
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  rowPressed: {
    backgroundColor: "#F9FAFB",
  },
  rowContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
  },
  rowType: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
  },
});
