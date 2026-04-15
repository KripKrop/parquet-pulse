import { motion } from "framer-motion";
import { Eye, Filter, Trash2, Copy, Calendar, HardDrive, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatBytes, formatNumber, getRelativeTime } from "@/lib/formatters";
import type { FilesListResponse } from "@/types/api";

type FileEntry = FilesListResponse["files"][0];

interface FileCardProps {
  file: FileEntry;
  selected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onFilter: () => void;
  onDelete: () => void;
  onCopy: (text: string, label: string) => void;
  index: number;
}

export function FileCard({ file, selected, onToggleSelect, onView, onFilter, onDelete, onCopy, index }: FileCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`glass-card rounded-lg p-4 space-y-3 ${selected ? "ring-2 ring-primary/50 bg-accent/20" : ""}`}
    >
      {/* Top row: checkbox + filename + badge */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          className="mt-0.5"
          aria-label={`Select ${file.filename}`}
        />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{file.filename}</div>
          <div className="flex items-center gap-2 mt-1">
            {file.ext && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {file.ext.toUpperCase()}
              </Badge>
            )}
            <Badge variant={file.current_row_count > 0 ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
              {file.current_row_count > 0 ? "Active" : "Empty"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Metadata row */}
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{getRelativeTime(file.uploaded_at)}</span>
        </div>
        <div className="flex items-center gap-1">
          <HardDrive className="h-3 w-3" />
          <span>{file.size_bytes ? formatBytes(file.size_bytes) : "—"}</span>
        </div>
        <div className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          <span>{formatNumber(file.current_row_count)} rows</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-1 border-t border-border/50">
        <Button variant="ghost" size="sm" className="h-8 text-xs flex-1" onClick={onView}>
          <Eye className="h-3.5 w-3.5 mr-1" /> View
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs flex-1" onClick={onFilter}>
          <Filter className="h-3.5 w-3.5 mr-1" /> Filter
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onCopy(file.file_id, "File ID")}>
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
