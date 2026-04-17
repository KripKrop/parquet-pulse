import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, X, Lightbulb, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TourProgress } from "./TourProgress";
import type { TourStep, TourPlacement } from "@/contexts/TourContext";

interface TourTooltipProps {
  step: TourStep;
  index: number;
  total: number;
  rect: DOMRect | null;
  placement: TourPlacement;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onGoTo: (i: number) => void;
}

const TOOLTIP_WIDTH = 360;
const TOOLTIP_OFFSET = 16;
const VIEWPORT_PADDING = 16;

function computePosition(
  rect: DOMRect | null,
  preferred: TourPlacement,
  tooltipHeight: number
): { x: number; y: number; side: TourPlacement } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Centered (no target)
  if (!rect || preferred === "center") {
    return {
      x: Math.max(VIEWPORT_PADDING, (vw - TOOLTIP_WIDTH) / 2),
      y: Math.max(VIEWPORT_PADDING, (vh - tooltipHeight) / 2),
      side: "center",
    };
  }

  // Try preferred side, then fall back to one with most space
  const trySides: TourPlacement[] = [preferred, "bottom", "top", "right", "left"];
  for (const side of trySides) {
    let x = 0, y = 0;
    if (side === "bottom") {
      x = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      y = rect.bottom + TOOLTIP_OFFSET;
      if (y + tooltipHeight < vh - VIEWPORT_PADDING) {
        x = Math.max(VIEWPORT_PADDING, Math.min(x, vw - TOOLTIP_WIDTH - VIEWPORT_PADDING));
        return { x, y, side };
      }
    } else if (side === "top") {
      x = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
      y = rect.top - tooltipHeight - TOOLTIP_OFFSET;
      if (y > VIEWPORT_PADDING) {
        x = Math.max(VIEWPORT_PADDING, Math.min(x, vw - TOOLTIP_WIDTH - VIEWPORT_PADDING));
        return { x, y, side };
      }
    } else if (side === "right") {
      x = rect.right + TOOLTIP_OFFSET;
      y = rect.top + rect.height / 2 - tooltipHeight / 2;
      if (x + TOOLTIP_WIDTH < vw - VIEWPORT_PADDING) {
        y = Math.max(VIEWPORT_PADDING, Math.min(y, vh - tooltipHeight - VIEWPORT_PADDING));
        return { x, y, side };
      }
    } else if (side === "left") {
      x = rect.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
      y = rect.top + rect.height / 2 - tooltipHeight / 2;
      if (x > VIEWPORT_PADDING) {
        y = Math.max(VIEWPORT_PADDING, Math.min(y, vh - tooltipHeight - VIEWPORT_PADDING));
        return { x, y, side };
      }
    }
  }

  // Fallback: bottom-clamped
  return {
    x: Math.max(VIEWPORT_PADDING, Math.min(rect.left, vw - TOOLTIP_WIDTH - VIEWPORT_PADDING)),
    y: Math.min(rect.bottom + TOOLTIP_OFFSET, vh - tooltipHeight - VIEWPORT_PADDING),
    side: "bottom",
  };
}

export function TourTooltip({
  step,
  index,
  total,
  rect,
  placement,
  isFirst,
  isLast,
  onNext,
  onPrev,
  onSkip,
  onFinish,
  onGoTo,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -9999, y: -9999, side: "center" as TourPlacement });

  useEffect(() => {
    const update = () => {
      const h = tooltipRef.current?.offsetHeight ?? 280;
      setPos(computePosition(rect, placement, h));
    };
    update();
    const id = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [rect, placement, step.id]);

  const Icon = step.icon;

  return (
    <motion.div
      ref={tooltipRef}
      key={step.id}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 4 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="glass-float fixed rounded-2xl p-5 pointer-events-auto"
      style={{
        zIndex: 110,
        width: TOOLTIP_WIDTH,
        left: pos.x,
        top: pos.y,
      }}
      role="dialog"
      aria-labelledby={`tour-step-title-${step.id}`}
      aria-describedby={`tour-step-desc-${step.id}`}
    >
      {/* Top row: icon + step counter + close */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary-foreground" />
          </div>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
            Step {index + 1} of {total}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="text-muted-foreground hover:text-foreground transition-colors -mt-1 -mr-1 p-1 rounded-md hover:bg-muted"
          aria-label="Skip tour"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Title */}
      <h3
        id={`tour-step-title-${step.id}`}
        className="text-lg font-semibold tracking-tight text-gradient-primary mb-1.5"
      >
        {step.title}
      </h3>

      {/* Description */}
      <p
        id={`tour-step-desc-${step.id}`}
        className="text-sm text-muted-foreground leading-relaxed"
      >
        {step.description}
      </p>

      {/* Tip chip */}
      {step.tip && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/50 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground/70" />
          <span>{step.tip}</span>
        </div>
      )}

      {/* Warning chip */}
      {step.warning && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{step.warning}</span>
        </div>
      )}

      {/* Footer: progress + buttons */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <TourProgress total={total} current={index} onDotClick={onGoTo} />
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Button variant="ghost" size="sm" onClick={onPrev} className="h-8 px-2">
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          )}
          {isLast ? (
            <Button size="sm" onClick={onFinish} className="h-8 hover-glow">
              <Check className="h-3.5 w-3.5 mr-1" />
              Finish
            </Button>
          ) : (
            <Button size="sm" onClick={onNext} className="h-8 hover-glow">
              {isFirst ? "Start tour" : "Next"}
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
