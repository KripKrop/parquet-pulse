import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCollab } from "@/contexts/CollabProvider";
import { AvatarChip } from "@/components/profile/AvatarChip";
import { viewStateSummary } from "@/lib/viewStateSummary";

const MAX_VISIBLE = 4;

export function PresenceAvatars() {
  const { onlineUsers, transport } = useCollab();
  if (onlineUsers.length === 0) return null;

  const visible = onlineUsers.slice(0, MAX_VISIBLE);
  const overflow = onlineUsers.length - visible.length;

  return (
    <div className="flex items-center" title={`Live: ${transport}`}>
      {visible.map((u, i) => (
        <Popover key={u.user_id}>
          <PopoverTrigger asChild>
            <button className="-ml-2 first:ml-0 transition-transform hover:scale-110" style={{ zIndex: 10 - i }}>
              <AvatarChip
                name={u.name}
                email={u.email}
                avatarUrl={u.avatar_url}
                color={u.color}
                size="sm"
                online
              />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 glass-float">
            <div className="flex items-center gap-2">
              <AvatarChip
                name={u.name}
                email={u.email}
                avatarUrl={u.avatar_url}
                color={u.color}
                size="md"
              />
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground truncate">{u.email}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">{viewStateSummary(u.view_state)}</div>
          </PopoverContent>
        </Popover>
      ))}
      {overflow > 0 && (
        <div className="-ml-2 h-7 w-7 rounded-full bg-muted text-xs flex items-center justify-center font-medium">
          +{overflow}
        </div>
      )}
    </div>
  );
}
