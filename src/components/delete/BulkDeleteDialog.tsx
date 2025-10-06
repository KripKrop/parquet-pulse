import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { request } from "@/services/apiClient";

export const BulkDeleteDialog: React.FC<{
  filters: Record<string, string[]>;
  onDeleted?: (deleted: number) => void;
}> = ({ filters, onDeleted }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  const doDryRun = async () => {
    setBusy(true);
    setMatched(null);
    try {
      const res = await request<{ matched: number; dry_run?: boolean }>("/delete", {
        method: "POST",
        body: JSON.stringify({ filters, dry_run: true }),
      });
      setMatched(res.matched);
      toast({ title: "Preview complete", description: `${res.matched} rows match your filters` });
    } catch (e: any) {
      const status = e?.status;
      if (status === 400) {
        toast({ title: "Invalid request", description: e.message, variant: "destructive" });
      } else if (status === 403) {
        toast({ title: "Access denied", description: "You don't have permission to delete data", variant: "destructive" });
      } else if (status === 404) {
        toast({ title: "Not found", description: "Resource not found or access denied", variant: "destructive" });
      } else {
        toast({ title: "Preview failed", description: e.message, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!matched || matched <= 0) return;
    setConfirming(true);
    try {
      const payload: any = {
        filters,
        confirm: true,
        expected_min: matched,
        expected_max: matched,
      };
      const res = await request<{ deleted: number }>("/delete", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast({ title: "Deleted", description: `${res.deleted ?? matched} rows removed` });
      setOpen(false);
      setMatched(null);
      onDeleted?.(res.deleted ?? matched);
    } catch (e: any) {
      const status = e?.status;
      if (status === 409) {
        toast({
          title: "Deletion aborted",
          description: e.message || "Dataset changed since preview. Please run preview again.",
          variant: "destructive",
        });
      } else if (status === 400) {
        toast({ title: "Missing confirmation", description: e.message, variant: "destructive" });
      } else if (status === 403) {
        toast({ title: "Access denied", description: "You don't have permission to delete data", variant: "destructive" });
      } else if (status === 404) {
        toast({ title: "Not found", description: "Resource not found or access denied", variant: "destructive" });
      } else {
        toast({ title: "Delete failed", description: e.message, variant: "destructive" });
      }
    } finally {
      setConfirming(false);
    }
  };

  const reset = () => {
    setMatched(null);
    setBusy(false);
    setConfirming(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="destructive">Bulk Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Delete by Filters</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This will permanently delete all rows that match your current filters. Start with a preview to see how many rows
            will be affected. Then confirm to delete.
          </p>
          {(busy || confirming) && <Progress value={undefined} aria-label="deletion progress" />}
          <div className="text-sm">
            {matched == null ? (
              <span className="text-muted-foreground">No preview yet.</span>
            ) : matched === 0 ? (
              <span className="text-muted-foreground">No rows match the current filters.</span>
            ) : (
              <span><strong>{matched}</strong> rows will be deleted.</span>
            )}
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([k, vals]) => (
              <span key={k} className="text-xs px-2 py-1 rounded bg-secondary" title={vals.join(", ")}>{k}: {vals.length}</span>
            ))}
            {Object.keys(filters).length === 0 && (
              <span className="text-xs text-muted-foreground">No filters applied</span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy || confirming}>Close</Button>
          <Button onClick={doDryRun} disabled={busy || confirming}>Preview matches</Button>
          <Button variant="destructive" onClick={doConfirm} disabled={confirming || busy || !matched || matched === 0}>
            Delete {matched ?? ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
