import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../lib/hooks/useAuth";

export default function SettingsTab() {
  const { baseUrl, disconnect } = useAuth();

  const appVersion = Constants.expoConfig?.version ?? "—";

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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Site URL</Text>
          <Text style={styles.rowValue} numberOfLines={1}>
            {baseUrl}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>{appVersion}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.disconnectButton,
            pressed && styles.disconnectPressed,
          ]}
          onPress={handleDisconnect}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.disconnectText}>Disconnect</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
    gap: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 15,
    color: "#374151",
  },
  rowValue: {
    fontSize: 15,
    color: "#6B7280",
    flexShrink: 1,
    marginLeft: 16,
    textAlign: "right",
  },
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  disconnectPressed: {
    opacity: 0.6,
  },
  disconnectText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
});
