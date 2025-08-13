import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value: number;
  className?: string;
  showPercentage?: boolean;
}

export function AnimatedProgress({ 
  value, 
  className, 
  showPercentage = false 
}: AnimatedProgressProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Progress value={value} className="h-2" />
      </motion.div>
      {showPercentage && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-right text-sm text-muted-foreground"
        >
          {Math.round(value)}%
        </motion.div>
      )}
    </div>
  );
}