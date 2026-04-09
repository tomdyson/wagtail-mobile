import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ApiError, obtainToken } from "../lib/api";
import { useAuth } from "../lib/hooks/useAuth";

export default function LoginScreen() {
  const { login } = useAuth();
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    const trimmedUrl = url.trim().replace(/\/$/, "");
    if (!trimmedUrl || !username.trim() || !password) {
      setError("All fields are required");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const result = await obtainToken(trimmedUrl, username.trim(), password);
      await login(trimmedUrl, result.token);
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          setError("Invalid username or password");
        } else {
          setError(e.message);
        }
      } else if (e instanceof TypeError) {
        setError("Could not connect. Check the URL and try again.");
      } else {
        setError(String(e));
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.heading}>Wagtail Mobile</Text>
        <Text style={styles.subheading}>
          Connect to your Wagtail site
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>API URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/api/write/v1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              textContentType="URL"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="admin"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              textContentType="password"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              connecting && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleConnect}
            disabled={connecting}
          >
            <Text style={styles.buttonText}>
              {connecting ? "Connecting..." : "Connect"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  subheading: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  error: {
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
