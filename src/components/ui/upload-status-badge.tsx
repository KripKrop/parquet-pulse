import { cn } from "@/lib/utils";
import type { UploadStatus } from "@/types/upload";

interface UploadStatusBadgeProps {
  status: UploadStatus;
  className?: string;
}

export function UploadStatusBadge({ status, className }: UploadStatusBadgeProps) {
  const getStatusConfig = (status: UploadStatus) => {
    switch (status) {
      case "pending":
        return {
          icon: "⏳",
          text: "Pending",
          className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        };
      case "validating":
        return {
          icon: "🔍",
          text: "Validating",
          className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        };
      case "uploading":
        return {
          icon: "⬆️",
          text: "Uploading",
          className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        };
      case "processing":
        return {
          icon: "⚙️",
          text: "Processing",
          className: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
        };
      case "completed":
        return {
          icon: "✅",
          text: "Completed",
          className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
        };
      case "failed":
        return {
          icon: "❌",
          text: "Failed",
          className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
        };
      case "cancelled":
        return {
          icon: "⏹️",
          text: "Cancelled",
          className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        };
      case "retrying":
        return {
          icon: "🔄",
          text: "Retrying",
          className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        };
      default:
        return {
          icon: "❓",
          text: "Unknown",
          className: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
      config.className,
      className
    )}>
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </span>
  );
}