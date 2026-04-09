import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ImageCard } from "../../components/ImageCard";
import { useImageList } from "../../lib/hooks/useImages";

const NUM_COLUMNS = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_SIZE = Math.floor((SCREEN_WIDTH - 4) / NUM_COLUMNS);

export default function ImagesTab() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { images, loading, error, refresh } = useImageList(
    search ? { search, limit: 30 } : { limit: 30 }
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color="#9CA3AF"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search images..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      <FlatList
        data={images}
        keyExtractor={(item) => String(item.id)}
        numColumns={NUM_COLUMNS}
        renderItem={({ item }) => (
          <ImageCard
            image={item}
            size={CARD_SIZE}
            onPress={() => router.push(`/images/${item.id}`)}
          />
        )}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={images.length === 0 ? styles.empty : undefined}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContent}>
              <Ionicons name="images-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No images found</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: "#111827",
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
  },
  empty: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
});
