import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { resolveMediaUrl } from "../lib/api";
import type { ImageItem } from "../lib/types";

interface Props {
  image: ImageItem;
  baseUrl: string;
  onPress: () => void;
  size: number;
}

export function ImageCard({ image, baseUrl, onPress, size }: Props) {
  const thumbnailUrl = resolveMediaUrl(baseUrl, image.renditions?.thumbnail || image.file_url);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={[styles.image, { width: size, height: size }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size }]}>
          <Text style={styles.placeholderText}>No image</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
  },
  pressed: {
    opacity: 0.7,
  },
  image: {
    borderRadius: 4,
  },
  placeholder: {
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
