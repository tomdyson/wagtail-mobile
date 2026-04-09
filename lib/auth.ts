import * as SecureStore from "expo-secure-store";

const URL_KEY = "wagtail_base_url";
const TOKEN_KEY = "wagtail_api_token";

export async function getCredentials(): Promise<{
  baseUrl: string;
  token: string;
} | null> {
  const baseUrl = await SecureStore.getItemAsync(URL_KEY);
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (baseUrl && token) {
    return { baseUrl, token };
  }
  return null;
}

export async function saveCredentials(
  baseUrl: string,
  token: string
): Promise<void> {
  await SecureStore.setItemAsync(URL_KEY, baseUrl.replace(/\/$/, ""));
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(URL_KEY);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
