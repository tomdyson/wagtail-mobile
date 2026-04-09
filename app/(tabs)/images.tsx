import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ImageCard } from "../../components/ImageCard";
import { ImageGridSkeleton } from "../../components/Skeleton";
import { ApiError, images as imagesApi } from "../../lib/api";
import { useAuth } from "../../lib/hooks/useAuth";
import { useImageList } from "../../lib/hooks/useImages";

const NUM_COLUMNS = 3;
const HORIZONTAL_PADDING = 16;
const GAP = 2;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_SIZE = Math.floor(
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
);

export default function ImagesTab() {
  const router = useRouter();
  const { baseUrl, token } = useAuth();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const { images, loading, error, refresh } = useImageList(
    search ? { search, limit: 30 } : { limit: 30 }
  );

  const handleUpload = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const fileName = asset.fileName || asset.uri.split("/").pop() || "image.jpg";
    const mimeType = asset.mimeType || "image/jpeg";

    setUploading(true);
    try {
      const uploaded = await imagesApi.upload(baseUrl, token, asset.uri, fileName, mimeType);
      setUploading(false);
      router.push(`/images/${uploaded.id}`);
    } catch (e) {
      setUploading(false);
      const msg = e instanceof ApiError ? e.message : String(e);
      Alert.alert("Upload failed", msg);
    }
  }, [baseUrl, token, refresh]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              hitSlop={8}
              style={{ marginRight: 16 }}
            >
              <Ionicons
                name={uploading ? "hourglass-outline" : "cloud-upload-outline"}
                size={24}
                color={uploading ? "#9CA3AF" : "#3B82F6"}
              />
            </Pressable>
          ),
        }}
      />

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
        columnWrapperStyle={styles.row}
        contentContainerStyle={[
          { paddingHorizontal: HORIZONTAL_PADDING },
          images.length === 0 ? styles.empty : undefined,
        ]}
        renderItem={({ item }) => (
          <ImageCard
            image={item}
            baseUrl={baseUrl}
            size={CARD_SIZE}
            onPress={() => router.push(`/images/${item.id}`)}
          />
        )}
        refreshing={loading && images.length > 0}
        onRefresh={refresh}
        ListEmptyComponent={
          loading ? (
            <ImageGridSkeleton />
          ) : (
            <View style={styles.emptyContent}>
              <Ionicons name="images-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No images found</Text>
            </View>
          )
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
  row: {
    gap: GAP,
    marginBottom: GAP,
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
