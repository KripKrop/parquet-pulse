import { useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RowDetailModalProps {
  row: Record<string, any> | null;
  columns: string[];
  currentIndex: number;
  totalRows: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export function RowDetailModal({
  row,
  columns,
  currentIndex,
  totalRows,
  onClose,
  onPrev,
  onNext,
}: RowDetailModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        onNext();
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        onPrev();
      }
    },
    [onNext, onPrev]
  );

  useEffect(() => {
    if (!row) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [row, handleKeyDown]);

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: "Value copied to clipboard" });
  };

  if (!row) return null;

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-6">
            <span>Row {currentIndex + 1} of {totalRows}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={onPrev}
                disabled={currentIndex <= 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={onNext}
                disabled={currentIndex >= totalRows - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1">
            {columns.map((col) => {
              const value = String(row[col] ?? "");
              return (
                <div
                  key={col}
                  className="flex items-start gap-3 py-2 border-b border-border/50 group"
                >
                  <span className="text-sm font-medium text-muted-foreground min-w-[120px] shrink-0 pt-0.5">
                    {col}
                  </span>
                  <span className="text-sm font-mono break-all flex-1">{value || "—"}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => copyValue(value)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="text-xs text-muted-foreground pt-2 border-t">
          Use <kbd className="px-1 py-0.5 rounded bg-muted text-xs">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-muted text-xs">↓</kbd> or <kbd className="px-1 py-0.5 rounded bg-muted text-xs">J</kbd> <kbd className="px-1 py-0.5 rounded bg-muted text-xs">K</kbd> to navigate rows
        </div>
      </DialogContent>
    </Dialog>
  );
}
