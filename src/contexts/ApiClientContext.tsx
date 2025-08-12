import { createContext, useContext, useMemo, useState } from "react";
import { setApiConfig, getApiConfig, wsUrl as buildWsUrl } from "@/services/apiClient";

export type ApiClientContextValue = {
  baseUrl: string;
  apiKey: string;
  setConfig: (cfg: { baseUrl: string; apiKey: string }) => void;
  wsUrl: (path: string) => string;
};

const ApiClientContext = createContext<ApiClientContextValue | undefined>(undefined);

export const ApiClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = getApiConfig();
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey);

  const value = useMemo<ApiClientContextValue>(() => ({
    baseUrl,
    apiKey,
    setConfig: (cfg) => {
      setBaseUrl(cfg.baseUrl);
      setApiKey(cfg.apiKey);
      setApiConfig(cfg);
    },
    wsUrl: buildWsUrl,
  }), [baseUrl, apiKey]);

  return <ApiClientContext.Provider value={value}>{children}</ApiClientContext.Provider>;
};

export function useApiClient() {
  const ctx = useContext(ApiClientContext);
  if (!ctx) throw new Error("useApiClient must be used within ApiClientProvider");
  return ctx;
}
