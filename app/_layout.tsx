import { Stack, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { clearCredentials, getCredentials, saveCredentials } from "../lib/auth";
import { AuthContext, type AuthState } from "../lib/hooks/useAuth";

export default function RootLayout() {
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    (async () => {
      const creds = await getCredentials();
      if (creds) {
        setBaseUrl(creds.baseUrl);
        setToken(creds.token);
      }
      setIsLoading(false);
    })();
  }, []);

  const isConfigured = Boolean(baseUrl && token);

  useEffect(() => {
    if (isLoading) return;

    const inLogin = segments[0] === "login";

    if (!isConfigured && !inLogin) {
      router.replace("/login");
    } else if (isConfigured && inLogin) {
      router.replace("/");
    }
  }, [isConfigured, isLoading, segments]);

  const login = useCallback(async (url: string, tok: string) => {
    await saveCredentials(url, tok);
    setBaseUrl(url.replace(/\/$/, ""));
    setToken(tok);
  }, []);

  const disconnect = useCallback(async () => {
    await clearCredentials();
    setBaseUrl("");
    setToken("");
  }, []);

  const authState: AuthState = {
    baseUrl,
    token,
    isConfigured,
    isLoading,
    login,
    disconnect,
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authState}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="pages/create" options={{ title: "New Page" }} />
        <Stack.Screen name="pages/[id]" options={{ title: "Page" }} />
        <Stack.Screen
          name="pages/children/[parentId]"
          options={{ title: "Pages" }}
        />
        <Stack.Screen name="images/[id]" options={{ title: "Image" }} />
      </Stack>
    </AuthContext.Provider>
  );
}
