import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface AvatarChipProps {
  name: string;
  email?: string;
  avatarUrl?: string | null;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  online?: boolean;
  ring?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { box: "h-6 w-6 text-[10px]", dot: "h-2 w-2 -bottom-0 -right-0" },
  sm: { box: "h-7 w-7 text-xs", dot: "h-2 w-2 -bottom-0 -right-0" },
  md: { box: "h-9 w-9 text-sm", dot: "h-2.5 w-2.5 -bottom-0.5 -right-0.5" },
  lg: { box: "h-12 w-12 text-base", dot: "h-3 w-3 -bottom-0.5 -right-0.5" },
};

function initialsFrom(name: string, email?: string): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Derived ring color from server-owned color string. Falls back to border token. */
function resolveRingColor(color?: string): string | undefined {
  if (!color) return undefined;
  return color.startsWith("hsl") || color.startsWith("#") || color.startsWith("rgb")
    ? color
    : `#${color}`;
}

export function AvatarChip({
  name,
  email,
  avatarUrl,
  color,
  size = "md",
  online,
  ring = true,
  className,
}: AvatarChipProps) {
  const sz = SIZE_MAP[size];
  const initials = useMemo(() => initialsFrom(name, email), [name, email]);
  const ringColor = resolveRingColor(color);

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={ring && ringColor ? { boxShadow: `0 0 0 2px ${ringColor}` } : undefined}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={cn(sz.box, "rounded-full object-cover bg-muted")}
          loading="lazy"
        />
      ) : (
        <div
          className={cn(
            sz.box,
            "rounded-full flex items-center justify-center font-semibold uppercase text-foreground/80 bg-muted"
          )}
          style={ringColor ? { backgroundColor: `${ringColor}22` } : undefined}
          aria-label={name}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute rounded-full ring-2 ring-background",
            sz.dot,
            online ? "bg-emerald-500" : "bg-muted-foreground/40"
          )}
          aria-hidden
        />
      )}
    </div>
  );
}
