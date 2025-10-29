import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/apiClient";
import type { ColumnsResponse } from "@/types/api";

export function useDatasetVersion() {
  return useQuery({
    queryKey: ["dataset-version"],
    queryFn: async () => {
      const response: any = await request<ColumnsResponse>("/columns");
      return response._headers?.get("X-Dataset-Version") || "unknown";
    },
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 20000,
  });
}
