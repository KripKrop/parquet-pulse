import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { annotationsApi, AnnotationObject } from "@/services/annotationsApi";
import { wsClient } from "@/services/wsClient";
import { normalizeViewState, NormalizedViewState } from "@/lib/viewStateSummary";

const rowKey = (fileId: string, rowHash: string) => ["annotations", "row", fileId, rowHash];
const viewKey = (route: string, vs: any) => ["annotations", "view", route, JSON.stringify(vs)];

export function useAnnotationsForRow(fileId: string | null, rowHash: string | null) {
  const qc = useQueryClient();
  const enabled = !!fileId && !!rowHash;

  useEffect(() => {
    if (!enabled) return;
    const off = wsClient.on("annotation.created", (p: any) => {
      const a: AnnotationObject = p?.annotation ?? p;
      if (a.anchor.kind !== "row") return;
      if (a.anchor.file_id !== fileId || a.anchor.row_hash !== rowHash) return;
      qc.setQueryData<AnnotationObject[]>(rowKey(fileId!, rowHash!), (prev) => {
        const list = prev ?? [];
        if (list.some((x) => x.id === a.id)) return list;
        return [a, ...list];
      });
    });
    return off;
  }, [enabled, fileId, rowHash, qc]);

  return useQuery({
    queryKey: enabled ? rowKey(fileId!, rowHash!) : ["annotations", "row", "noop"],
    queryFn: async () => {
      const res = await annotationsApi.resolveForRow(fileId!, rowHash!);
      return res.annotations;
    },
    enabled,
    staleTime: 30_000,
  });
}

export function useAnnotationsForView(route: string, viewState: NormalizedViewState) {
  const qc = useQueryClient();
  const normalized = normalizeViewState(viewState);

  useEffect(() => {
    const off = wsClient.on("annotation.created", (p: any) => {
      const a: AnnotationObject = p?.annotation ?? p;
      if (a.anchor.kind !== "view") return;
      if (a.anchor.route !== route) return;
      qc.invalidateQueries({ queryKey: ["annotations", "view", route] });
    });
    return off;
  }, [route, qc]);

  return useQuery({
    queryKey: viewKey(route, normalized),
    queryFn: async () => {
      const res = await annotationsApi.resolveForView(route, normalized);
      return res.annotations;
    },
    staleTime: 30_000,
  });
}
