import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Share } from "react-native";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, images as imagesApi, resolveMediaUrl } from "../../lib/api";
import { useAuth } from "../../lib/hooks/useAuth";
import { useImageDetail } from "../../lib/hooks/useImages";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ImageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { baseUrl, token } = useAuth();
  const router = useRouter();
  const { image, loading, error, refresh } = useImageDetail(Number(id));

  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (image) {
      setTitle(image.title);
    }
  }, [image]);

  const isDirty = image !== null && title !== image.title;

  const handleSave = useCallback(async () => {
    if (!image || !isDirty) return;
    setSaving(true);
    try {
      await imagesApi.update(baseUrl, token, image.id, { title });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refresh();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      Alert.alert("Save failed", msg);
    } finally {
      setSaving(false);
    }
  }, [image, title, isDirty, baseUrl, token, refresh]);

  const handleDelete = useCallback(async () => {
    if (!image) return;
    Alert.alert(
      "Delete image",
      `Are you sure you want to delete "${image.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await imagesApi.delete(baseUrl, token, image.id);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (e) {
              const msg = e instanceof ApiError ? e.message : String(e);
              Alert.alert("Delete failed", msg);
            }
          },
        },
      ]
    );
  }, [image, baseUrl, token, router]);

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

  const imageUrl = resolveMediaUrl(baseUrl, image.renditions?.large || image.file_url);
  const aspectRatio = image.width && image.height ? image.width / image.height : 1;
  const displayWidth = SCREEN_WIDTH;
  const displayHeight = displayWidth / aspectRatio;

  const handleShare = async () => {
    const shareUrl = resolveMediaUrl(baseUrl, image.file_url);
    if (shareUrl) {
      await Share.share({ url: shareUrl });
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: image.title,
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              {isDirty && (
                <Pressable onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveButton}>
                    {saving ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={handleShare} hitSlop={8}>
                <Ionicons name="share-outline" size={22} color="#3B82F6" />
              </Pressable>
            </View>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
      <ScrollView keyboardShouldPersistTaps="handled">
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: displayWidth, height: displayHeight }}
            resizeMode="contain"
          />
        )}

        <View style={styles.info}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.fieldInput}
              value={title}
              onChangeText={setTitle}
            />
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

          <Pressable
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deletePressed,
            ]}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Delete Image</Text>
          </Pressable>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
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
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FAFAFA",
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
  deleteButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deletePressed: {
    opacity: 0.7,
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
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
