import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarChip } from "@/components/profile/AvatarChip";
import { Users, UserPlus, MoreVertical, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useTenantMembersList,
  useUpdateMemberRole,
} from "@/hooks/useTenantMembersAdmin";
import type { TenantMemberAdmin } from "@/services/collabApi";
import { AddMemberDialog } from "./AddMemberDialog";
import { RemoveMemberDialog } from "./RemoveMemberDialog";
import { Skeleton } from "@/components/ui/skeleton";

export function TenantMembersCard() {
  const { user } = useAuth();
  const { data: members, isLoading, isError, error } = useTenantMembersList();
  const updateRole = useUpdateMemberRole();
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<TenantMemberAdmin | null>(null);

  const currentUserId = user?.user_id;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </CardTitle>
          <CardDescription>Manage who has access to this tenant.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)} className="hover-glow">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite member
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-sm text-destructive p-3 rounded-md bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <span>Failed to load members: {(error as Error)?.message}</span>
          </div>
        )}

        {!isLoading && !isError && members && members.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No members yet. Invite the first one.
          </p>
        )}

        {!isLoading && !isError && members && members.length > 0 && (
          <ul className="divide-y divide-border/50 -mx-2">
            <AnimatePresence initial={false}>
              {members.map((m, i) => {
                const isSelf = m.user_id === currentUserId;
                const isOwner = m.role === "owner";
                return (
                  <motion.li
                    key={m.user_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="flex items-center gap-3 px-2 py-3"
                  >
                    <AvatarChip
                      name={m.name}
                      email={m.email}
                      avatarUrl={m.avatar_url}
                      color={m.color}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        {isSelf && <Badge variant="outline" className="text-[10px] py-0">You</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                    </div>
                    <Badge variant={isOwner ? "default" : "secondary"} className="capitalize">
                      {m.role}
                    </Badge>
                    {!isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Member actions">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              updateRole.mutate({
                                userId: m.user_id,
                                role: isOwner ? "member" : "owner",
                              })
                            }
                          >
                            {isOwner ? "Demote to member" : "Promote to owner"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setRemoveTarget(m)}
                          >
                            Remove from tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </CardContent>

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
      <RemoveMemberDialog
        member={removeTarget}
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
      />
    </Card>
  );
}
