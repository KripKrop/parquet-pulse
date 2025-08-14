import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { request } from "@/services/apiClient";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";

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
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button variant="secondary" className="button-smooth liquid-bounce">
            📥 Download CSV
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="glass-panel border-0 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <DialogTitle className="text-gradient-primary">📥 Export CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
              className="origin-left"
            >
              <Progress value={busy ? undefined : 0} aria-label="download progress" className="h-2" />
            </motion.div>
            <motion.div 
              className="text-sm text-muted-foreground flex items-center gap-2"
              animate={{ opacity: busy ? 1 : 0.7 }}
            >
              {busy && <LoadingSpinner size="sm" />}
              Downloaded <motion.strong
                key={count}
                initial={{ scale: 1.2, color: "hsl(var(--primary))" }}
                animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                transition={{ duration: 0.3 }}
              >
                {count}
              </motion.strong> rows…
            </motion.div>
          </div>
          <DialogFooter className="gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                onClick={() => setOpen(false)} 
                disabled={busy}
                className="button-smooth"
              >
                Close
              </Button>
            </motion.div>
            {busy ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="destructive" 
                  onClick={cancel}
                  className="button-smooth"
                >
                  🛑 Cancel
                </Button>
              </motion.div>
            ) : (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={start}
                  className="button-smooth hover-glow"
                >
                  🚀 Start Download
                </Button>
              </motion.div>
            )}
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
