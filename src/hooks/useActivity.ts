import { useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { activityApi, ActivityEvent } from "@/services/collabApi";
import { wsClient } from "@/services/wsClient";

export function useActivity(filters: { types?: string[]; user_id?: string } = {}) {
  const qc = useQueryClient();
  const key = ["activity", filters.types?.join(",") ?? "", filters.user_id ?? ""];

  const query = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => activityApi.list({ ...filters, cursor: pageParam as string | undefined, limit: 30 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 15_000,
  });

  useEffect(() => {
    const off = wsClient.on("activity.created", (p: any) => {
      const evt: ActivityEvent = p?.event ?? p;
      qc.setQueryData<any>(key, (prev: any) => {
        if (!prev) return prev;
        const pages = [...prev.pages];
        if (pages[0]) pages[0] = { ...pages[0], events: [evt, ...pages[0].events] };
        return { ...prev, pages };
      });
    });
    return off;
  }, [JSON.stringify(filters), qc]);

  return query;
}
