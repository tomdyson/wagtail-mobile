import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { images, resolveMediaUrl } from "../../lib/api";
import { useAuth } from "../../lib/hooks/useAuth";
import type { ImageItem } from "../../lib/types";

const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLUMNS = 3;
const GAP = 2;
const MODAL_PADDING = 16;
const CARD_SIZE = Math.floor(
  (SCREEN_WIDTH - MODAL_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
);

interface Props {
  value: unknown;
  onChange: (imageId: number | null) => void;
  editable: boolean;
}

export function ImageChooser({ value, onChange, editable }: Props) {
  const { baseUrl, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImageItem | null>(null);

  // Fetch current image preview
  useEffect(() => {
    if (typeof value === "number" && value > 0) {
      images
        .get(baseUrl, token, value)
        .then(setPreview)
        .catch(() => setPreview(null));
    } else {
      setPreview(null);
    }
  }, [value, baseUrl, token]);

  const thumbnailUrl = preview
    ? resolveMediaUrl(baseUrl, preview.renditions?.thumbnail || preview.file_url)
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
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumb} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="image-outline" size={20} color="#9CA3AF" />
          </View>
        )}
        <View style={styles.selectorInfo}>
          <Text style={styles.selectorTitle} numberOfLines={1}>
            {preview ? preview.title : value ? `Image #${value}` : "Choose image"}
          </Text>
          {preview && (
            <Text style={styles.selectorMeta}>
              {preview.width} x {preview.height}
            </Text>
          )}
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
        <ImagePickerModal
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

function ImagePickerModal({
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
  const [items, setItems] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const filters = search ? { search, limit: 30 } : { limit: 30 };
      const result = await images.list(baseUrl, token, filters);
      setItems(result.items);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, search]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  return (
    <SafeAreaView style={modalStyles.container}>
      <View style={modalStyles.header}>
        <Text style={modalStyles.title}>Choose Image</Text>
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
          placeholder="Search images..."
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
        numColumns={NUM_COLUMNS}
        contentContainerStyle={modalStyles.grid}
        columnWrapperStyle={{ gap: GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        renderItem={({ item }) => {
          const url = resolveMediaUrl(
            baseUrl,
            item.renditions?.thumbnail || item.file_url
          );
          return (
            <Pressable
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              onPress={() => onSelect(item.id)}
            >
              {url ? (
                <Image
                  source={{ uri: url }}
                  style={{
                    width: CARD_SIZE,
                    height: CARD_SIZE,
                    borderRadius: 4,
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: CARD_SIZE,
                    height: CARD_SIZE,
                    borderRadius: 4,
                    backgroundColor: "#F3F4F6",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                    No image
                  </Text>
                </View>
              )}
              <Text
                style={modalStyles.imageTitle}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={modalStyles.empty}>
              <Text style={modalStyles.emptyText}>
                {search ? "No images found" : "No images"}
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
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  thumbPlaceholder: {
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
  grid: {
    paddingHorizontal: MODAL_PADDING,
    paddingBottom: 40,
  },
  imageTitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    width: CARD_SIZE,
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
