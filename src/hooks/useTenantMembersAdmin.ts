import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  tenantMembersApi,
  CollabApiError,
  type TenantMemberAdmin,
  type AddTenantMemberPayload,
} from "@/services/collabApi";

const LIST_KEY = ["tenant-members-admin"] as const;

function handleError(e: unknown, fallback: string) {
  if (e instanceof CollabApiError) {
    if (e.status === 403) {
      toast({ title: "Permission denied", description: "Only tenant owners can manage members.", variant: "destructive" });
      return;
    }
    if (e.status === 409) {
      toast({ title: "Already exists", description: e.message || "User already in this tenant.", variant: "destructive" });
      return;
    }
    if (e.status === 400) {
      toast({ title: "Invalid input", description: e.message, variant: "destructive" });
      return;
    }
    toast({ title: fallback, description: e.message, variant: "destructive" });
    return;
  }
  toast({ title: fallback, description: (e as Error)?.message ?? "Unknown error", variant: "destructive" });
}

export function useTenantMembersList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async (): Promise<TenantMemberAdmin[]> => {
      const res = await tenantMembersApi.list();
      if (Array.isArray(res)) return res;
      return res.members ?? [];
    },
    staleTime: 30_000,
  });
}

export function useAddTenantMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddTenantMemberPayload) => tenantMembersApi.add(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ["tenant-members"] });
      toast({ title: "Member added", description: "They now have access to this tenant." });
    },
    onError: (e) => handleError(e, "Failed to add member"),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "member" | "owner" }) =>
      tenantMembersApi.updateRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ["tenant-members"] });
      toast({ title: "Role updated" });
    },
    onError: (e) => handleError(e, "Failed to update role"),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => tenantMembersApi.remove(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY });
      qc.invalidateQueries({ queryKey: ["tenant-members"] });
      toast({ title: "Member removed" });
    },
    onError: (e) => handleError(e, "Failed to remove member"),
  });
}
