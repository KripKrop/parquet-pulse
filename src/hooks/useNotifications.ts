import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/services/collabApi";
import { wsClient } from "@/services/wsClient";

export function useNotifications() {
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => notificationsApi.list({ cursor: pageParam as string | undefined, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    staleTime: 15_000,
  });

  useEffect(() => {
    const off = wsClient.on("notification.created", () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    });
    return off;
  }, [qc]);

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { ...query, markRead, markAllRead };
}
