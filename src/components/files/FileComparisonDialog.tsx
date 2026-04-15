import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Minus } from "lucide-react";
import { formatBytes, formatDate, formatNumber } from "@/lib/formatters";
import type { FilesListResponse } from "@/types/api";

type FileEntry = FilesListResponse["files"][0];

interface FileComparisonDialogProps {
  fileA: FileEntry;
  fileB: FileEntry;
  open: boolean;
  onClose: () => void;
}

export function FileComparisonDialog({ fileA, fileB, open, onClose }: FileComparisonDialogProps) {
  const colsA = new Set(Object.keys(fileA.columns_map || {}));
  const colsB = new Set(Object.keys(fileB.columns_map || {}));
  const allCols = Array.from(new Set([...colsA, ...colsB])).sort();

  const shared = allCols.filter(c => colsA.has(c) && colsB.has(c)).length;
  const onlyA = allCols.filter(c => colsA.has(c) && !colsB.has(c)).length;
  const onlyB = allCols.filter(c => !colsA.has(c) && colsB.has(c)).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>File Comparison</DialogTitle>
        </DialogHeader>

        {/* Stats comparison */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="font-medium text-muted-foreground" />
          <div className="font-semibold truncate text-center">{fileA.filename}</div>
          <div className="font-semibold truncate text-center">{fileB.filename}</div>

          <div className="text-muted-foreground">Rows</div>
          <div className="text-center">{formatNumber(fileA.current_row_count)}</div>
          <div className="text-center">{formatNumber(fileB.current_row_count)}</div>

          <div className="text-muted-foreground">Size</div>
          <div className="text-center">{fileA.size_bytes ? formatBytes(fileA.size_bytes) : "—"}</div>
          <div className="text-center">{fileB.size_bytes ? formatBytes(fileB.size_bytes) : "—"}</div>

          <div className="text-muted-foreground">Uploaded</div>
          <div className="text-center">{formatDate(fileA.uploaded_at)}</div>
          <div className="text-center">{formatDate(fileB.uploaded_at)}</div>

          <div className="text-muted-foreground">Columns</div>
          <div className="text-center">{colsA.size}</div>
          <div className="text-center">{colsB.size}</div>
        </div>

        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">{shared} shared</Badge>
          {onlyA > 0 && <Badge className="bg-green-500/10 text-green-500 border-green-500/30">{onlyA} only in A</Badge>}
          {onlyB > 0 && <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">{onlyB} only in B</Badge>}
        </div>

        {/* Schema diff table */}
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-2 font-medium">Column</th>
                <th className="text-center px-3 py-2 font-medium truncate max-w-[150px]">{fileA.filename}</th>
                <th className="text-center px-3 py-2 font-medium truncate max-w-[150px]">{fileB.filename}</th>
              </tr>
            </thead>
            <tbody>
              {allCols.map(col => {
                const inA = colsA.has(col);
                const inB = colsB.has(col);
                const isUnique = inA !== inB;
                return (
                  <tr
                    key={col}
                    className={`border-b last:border-0 ${isUnique ? (inA ? "bg-green-500/5" : "bg-blue-500/5") : ""}`}
                  >
                    <td className="px-3 py-1.5 font-mono text-xs">{col}</td>
                    <td className="text-center px-3 py-1.5">
                      {inA ? <Check className="h-4 w-4 text-green-500 inline" /> : <Minus className="h-4 w-4 text-muted-foreground inline" />}
                    </td>
                    <td className="text-center px-3 py-1.5">
                      {inB ? <Check className="h-4 w-4 text-green-500 inline" /> : <Minus className="h-4 w-4 text-muted-foreground inline" />}
                    </td>
                  </tr>
                );
              })}
              {allCols.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-muted-foreground">No column data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
