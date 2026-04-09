import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { ImageItem } from "../lib/types";

interface Props {
  image: ImageItem;
  onPress: () => void;
  size: number;
}

export function ImageCard({ image, onPress, size }: Props) {
  const thumbnailUrl = image.renditions?.thumbnail || image.file_url;

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
    margin: 1,
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
