import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/apiClient";
import type { ColumnsResponse } from "@/types/api";

export function useDatasetVersion(enabled: boolean = true) {
  return useQuery({
    queryKey: ["dataset-version"],
    queryFn: async () => {
      const response: any = await request<ColumnsResponse>("/columns");
      return response._headers?.get("X-Dataset-Version") || "unknown";
    },
    enabled,
    refetchInterval: enabled ? 30000 : false,
    staleTime: 20000,
  });
}
