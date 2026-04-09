import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PageRow } from "../../components/PageRow";
import { PageListSkeleton } from "../../components/Skeleton";
import { useAuth } from "../../lib/hooks/useAuth";
import { usePageChildren, usePageSearch } from "../../lib/hooks/usePages";

export default function PagesTab() {
  const router = useRouter();
  const { disconnect } = useAuth();
  const [search, setSearch] = useState("");
  const isSearching = search.trim().length > 0;

  const children = usePageChildren(1);
  const searchResults = usePageSearch(
    isSearching ? { search: search.trim(), limit: 50 } : { limit: 0 }
  );

  const { pages, loading, error, refresh } = isSearching
    ? { pages: searchResults.pages, loading: searchResults.loading, error: searchResults.error, refresh: searchResults.refresh }
    : children;

  const handleDisconnect = () => {
    Alert.alert("Disconnect", "Remove this site connection?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => disconnect(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginRight: 8 }}>
              <Pressable
                onPress={() =>
                  router.push("/pages/create?parentId=1&parentType=wagtailcore.Page")
                }
                hitSlop={8}
              >
                <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
              </Pressable>
              <Pressable onPress={handleDisconnect} hitSlop={8}>
                <Ionicons name="settings-outline" size={22} color="#6B7280" />
              </Pressable>
            </View>
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
          placeholder="Search all pages..."
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
          <Pressable onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
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
        contentContainerStyle={pages.length === 0 ? styles.empty : undefined}
        ListEmptyComponent={
          loading ? (
            <PageListSkeleton />
          ) : (
            <View style={styles.emptyContent}>
              <Ionicons name="document-text-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {isSearching ? "No matching pages" : "No pages found"}
              </Text>
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
  errorBanner: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    flex: 1,
  },
  retryText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 12,
  },
  empty: {
    flex: 1,
  },
  emptyContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
  },
});
