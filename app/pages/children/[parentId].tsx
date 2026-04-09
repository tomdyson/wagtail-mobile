import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PageRow } from "../../../components/PageRow";
import { PageListSkeleton } from "../../../components/Skeleton";
import { usePageChildren, usePageDetail } from "../../../lib/hooks/usePages";

export default function PageChildrenScreen() {
  const { parentId } = useLocalSearchParams<{ parentId: string }>();
  const router = useRouter();
  const { pages, loading, loadingMore, hasMore, error, refresh, loadMore } = usePageChildren(Number(parentId));
  const { page: parent } = usePageDetail(Number(parentId));

  const parentType = parent?.meta.type;

  // Build breadcrumb from url_path (e.g. "/events/sub-section/" → ["Home", "Events", "Sub Section"])
  const breadcrumbs = parent?.meta.url_path
    ? ["Home", ...parent.meta.url_path
        .split("/")
        .filter(Boolean)
        .map((seg) =>
          seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        )]
    : null;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: parent?.title || "Pages",
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push(
                  `/pages/create?parentId=${parentId}${parentType ? `&parentType=${parentType}` : ""}`
                )
              }
              hitSlop={8}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
            </Pressable>
          ),
        }}
      />

      {breadcrumbs && (
        <View style={styles.breadcrumbBar}>
          {breadcrumbs.map((crumb, i) => (
            <Text key={i} style={styles.breadcrumbText}>
              {i > 0 && <Text style={styles.breadcrumbSep}> › </Text>}
              {crumb}
            </Text>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      <FlatList
        data={pages}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <PageRow
            page={item}
            onDrillDown={() => router.push(`/pages/children/${item.id}`)}
            onDetail={() => router.push(`/pages/${item.id}`)}
          />
        )}
        refreshing={loading && pages.length > 0}
        onRefresh={refresh}
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        contentContainerStyle={pages.length === 0 ? styles.empty : undefined}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <PageListSkeleton />
          ) : (
            <View style={styles.emptyContent}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No child pages</Text>
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
  breadcrumbBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  breadcrumbText: {
    fontSize: 13,
    color: "#6B7280",
  },
  breadcrumbSep: {
    color: "#D1D5DB",
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
