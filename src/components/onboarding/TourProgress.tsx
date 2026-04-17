import { motion } from "framer-motion";

interface TourProgressProps {
  total: number;
  current: number;
  onDotClick?: (i: number) => void;
}

export function TourProgress({ total, current, onDotClick }: TourProgressProps) {
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={current + 1} aria-valuemax={total}>
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i === current;
        const isPast = i < current;
        return (
          <motion.button
            key={i}
            type="button"
            onClick={() => onDotClick?.(i)}
            className="relative h-1.5 rounded-full transition-colors"
            animate={{
              width: isActive ? 24 : 6,
              backgroundColor: isActive
                ? "hsl(var(--primary))"
                : isPast
                ? "hsl(var(--primary) / 0.4)"
                : "hsl(var(--muted))",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            aria-label={`Go to step ${i + 1}`}
          />
        );
      })}
    </div>
  );
}
