import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { Share } from "react-native";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useImageDetail } from "../../lib/hooks/useImages";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ImageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { image, loading, error, refresh } = useImageDetail(Number(id));

  if (loading && !image) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Image" }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error && !image) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: "Error" }} />
        <Text style={styles.errorText}>{error.message}</Text>
        <Pressable onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!image) return null;

  const imageUrl = image.renditions?.large || image.file_url;
  const aspectRatio = image.width && image.height ? image.width / image.height : 1;
  const displayWidth = SCREEN_WIDTH;
  const displayHeight = displayWidth / aspectRatio;

  const handleShare = async () => {
    if (image.file_url) {
      await Share.share({ url: image.file_url });
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: image.title,
          headerRight: () => (
            <Pressable onPress={handleShare} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color="#3B82F6" />
            </Pressable>
          ),
        }}
      />

      <ScrollView>
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: displayWidth, height: displayHeight }}
            resizeMode="contain"
          />
        )}

        <View style={styles.info}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Title</Text>
            <Text style={styles.infoValue}>{image.title}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Dimensions</Text>
            <Text style={styles.infoValue}>
              {image.width} x {image.height}
            </Text>
          </View>
          {image.created_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Uploaded</Text>
              <Text style={styles.infoValue}>
                {new Date(image.created_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
  },
  info: {
    backgroundColor: "#fff",
    padding: 16,
    gap: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
  },
  retryText: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
});
