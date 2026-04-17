import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCollab } from "@/contexts/CollabProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AvatarChip } from "@/components/profile/AvatarChip";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { unreadNotifications } = useCollab();
  const { data, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const items = data?.pages.flatMap((p) => p.notifications) ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
          <motion.span
            animate={!reduce && unreadNotifications > 0 ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 1.4, repeat: unreadNotifications > 0 ? Infinity : 0 }}
            className="inline-flex"
          >
            <Bell className="h-4 w-4" />
          </motion.span>
          {unreadNotifications > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] tabular-nums">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 glass-float">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="text-sm font-medium">Notifications</span>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markAllRead.mutate()}>
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">No notifications yet</div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      markRead.mutate(n.id);
                      navigate(n.source.deep_link);
                    }}
                    className={`w-full text-left p-3 hover:bg-accent/50 flex gap-2 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <AvatarChip
                      name={n.actor.name}
                      avatarUrl={n.actor.avatar_url}
                      color={n.actor.color}
                      size="sm"
                      ring={false}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs">
                        <span className="font-medium">{n.actor.name}</span>{" "}
                        <span className="text-muted-foreground">
                          {n.type === "mention" ? "mentioned you" : n.type === "reply" ? "replied" : "reacted"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.source.preview}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
