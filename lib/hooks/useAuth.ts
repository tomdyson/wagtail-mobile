import { createContext, useContext } from "react";

export interface AuthState {
  baseUrl: string;
  token: string;
  isConfigured: boolean;
  isLoading: boolean;
  login: (baseUrl: string, token: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  baseUrl: "",
  token: "",
  isConfigured: false,
  isLoading: true,
  login: async () => {},
  disconnect: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
