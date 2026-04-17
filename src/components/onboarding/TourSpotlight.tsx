import { motion } from "framer-motion";

interface TourSpotlightProps {
  rect: DOMRect | null;
  padding?: number;
}

/**
 * Full-viewport SVG mask overlay with an animated rounded-rect cutout
 * around the target element. Uses spring physics for liquid motion.
 */
export function TourSpotlight({ rect, padding = 8 }: TourSpotlightProps) {
  const hasTarget = !!rect;
  const x = rect ? rect.left - padding : 0;
  const y = rect ? rect.top - padding : 0;
  const width = rect ? rect.width + padding * 2 : 0;
  const height = rect ? rect.height + padding * 2 : 0;
  const radius = 12;

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 100 }}
      aria-hidden="true"
    >
      <defs>
        <mask id="tour-spotlight-mask">
          {/* White = visible overlay */}
          <rect width="100%" height="100%" fill="white" />
          {/* Black cutout = transparent */}
          {hasTarget && (
            <motion.rect
              animate={{ x, y, width, height }}
              initial={false}
              transition={{ type: "spring", stiffness: 200, damping: 26, mass: 0.8 }}
              rx={radius}
              ry={radius}
              fill="black"
            />
          )}
        </mask>
      </defs>

      {/* Dark blurred backdrop */}
      <rect
        width="100%"
        height="100%"
        fill="hsl(var(--background))"
        fillOpacity="0.72"
        mask="url(#tour-spotlight-mask)"
        style={{ backdropFilter: "blur(4px)" }}
      />

      {/* Glow ring around the cutout */}
      {hasTarget && (
        <motion.rect
          animate={{ x, y, width, height }}
          initial={false}
          transition={{ type: "spring", stiffness: 200, damping: 26, mass: 0.8 }}
          rx={radius}
          ry={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeOpacity="0.5"
          strokeWidth="2"
          style={{ filter: "drop-shadow(0 0 24px hsl(var(--primary) / 0.6))" }}
        />
      )}
    </svg>
  );
}
