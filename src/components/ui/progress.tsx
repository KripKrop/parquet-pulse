import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const isIndeterminate = value == null
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary/80",
        "ring-1 ring-border/50 backdrop-blur-[1px]",
        className
      )}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : value}
      {...props}
    >
      {/* subtle inner border */}
      <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]" />

      {isIndeterminate ? (
        <div className="progress-indeterminate" />
      ) : (
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1",
            "bg-gradient-to-r from-primary to-primary/70",
            "transition-transform duration-500 ease-out will-change-transform",
            "shadow-[0_4px_20px_hsl(var(--primary)/0.2)]"
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        />
      )}
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
