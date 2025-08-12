import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { request } from "@/services/apiClient";

function toCsvValue(v: any) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/\"/g, '""') + '"';
  return s;
}

export const DownloadCsv: React.FC<{
  filters: Record<string, string[]>;
  fields?: string[];
}> = ({ filters, fields }) => {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      setCount(0);
      setBusy(false);
      controller.current?.abort();
      controller.current = null;
    }
  }, [open]);

  const start = async () => {
    setBusy(true);
    controller.current = new AbortController();
    try {
      const res = await request<Response>("/stream", {
        method: "POST",
        body: JSON.stringify({ filters, fields }),
        signal: controller.current.signal,
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let { value, done } = await reader.read();
      let buf = "";
      let headers: string[] | null = fields ? [...fields] : null;
      const chunks: string[] = [];

      while (!done) {
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (!line.trim()) continue;
          const obj = JSON.parse(line);
          if (!headers) headers = Object.keys(obj);
          if (chunks.length === 0) {
            chunks.push(headers.join(",") + "\n");
          }
          const row = headers.map((h) => toCsvValue(obj[h])).join(",") + "\n";
          chunks.push(row);
          setCount((c) => c + 1);
        }
        ({ value, done } = await reader.read());
      }
      // flush remainder
      if (buf.trim()) {
        const obj = JSON.parse(buf);
        if (!headers) headers = Object.keys(obj);
        if (chunks.length === 0) chunks.push(headers.join(",") + "\n");
        const row = headers.map((h) => toCsvValue(obj[h])).join(",") + "\n";
        chunks.push(row);
        setCount((c) => c + 1);
      }

      const blob = new Blob(chunks, { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
      a.href = url;
      a.download = `export-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Download complete", description: `${count} rows` });
      setOpen(false);
    } catch (e: any) {
      if (controller.current?.signal.aborted) {
        toast({ title: "Download cancelled" });
      } else {
        toast({ title: "Download failed", description: String(e.message || e), variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => controller.current?.abort();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">Download CSV</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Progress value={undefined} aria-label="download progress" />
          <div className="text-sm text-muted-foreground">Downloaded {count} rows…</div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>Close</Button>
          {busy ? (
            <Button variant="destructive" onClick={cancel}>Cancel</Button>
          ) : (
            <Button onClick={start}>Start</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
