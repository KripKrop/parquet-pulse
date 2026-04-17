import { useQuery } from "@tanstack/react-query";
import { membersApi, TenantMember } from "@/services/collabApi";

export function useTenantMembers(q?: string) {
  return useQuery({
    queryKey: ["tenant-members", q ?? ""],
    queryFn: () => membersApi.list(q),
    staleTime: 60_000,
    select: (d): TenantMember[] => d.members,
  });
}
