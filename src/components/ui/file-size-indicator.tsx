import { formatBytes } from "@/utils/uploadValidation";
import { cn } from "@/lib/utils";

interface FileSizeIndicatorProps {
  size: number;
  className?: string;
}

export function FileSizeIndicator({ size, className }: FileSizeIndicatorProps) {
  const getColorClass = (fileSize: number) => {
    if (fileSize > 1024 * 1024 * 1024) { // > 1GB
      return "text-amber-600 dark:text-amber-400";
    } else if (fileSize > 500 * 1024 * 1024) { // > 500MB
      return "text-orange-600 dark:text-orange-400";
    } else if (fileSize > 100 * 1024 * 1024) { // > 100MB
      return "text-blue-600 dark:text-blue-400";
    }
    return "text-muted-foreground";
  };

  const getIcon = (fileSize: number) => {
    if (fileSize > 1024 * 1024 * 1024) { // > 1GB
      return "🔥"; // Very large
    } else if (fileSize > 500 * 1024 * 1024) { // > 500MB
      return "⚡"; // Large
    } else if (fileSize > 100 * 1024 * 1024) { // > 100MB
      return "📊"; // Medium-large
    }
    return "📄"; // Normal
  };

  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", getColorClass(size), className)}>
      <span>{getIcon(size)}</span>
      <span>{formatBytes(size)}</span>
    </span>
  );
}