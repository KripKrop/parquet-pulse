import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRemoveMember } from "@/hooks/useTenantMembersAdmin";
import type { TenantMemberAdmin } from "@/services/collabApi";

interface Props {
  member: TenantMemberAdmin | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function RemoveMemberDialog({ member, open, onOpenChange }: Props) {
  const remove = useRemoveMember();

  const handleConfirm = async () => {
    if (!member) return;
    await remove.mutateAsync(member.user_id);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {member?.name || "member"}?</AlertDialogTitle>
          <AlertDialogDescription>
            They will lose access to this tenant immediately. Their account is not deleted and they may still belong to other tenants.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={remove.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {remove.isPending ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
