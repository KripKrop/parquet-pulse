import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { request } from "@/services/apiClient";
import { useJobStatus } from "@/hooks/useJobStatus";
import type { JobStatus } from "@/types/api";
import { motion } from "framer-motion";

const stageLabel: Record<NonNullable<JobStatus["stage"]>, string> = {
  uploading: "Uploading",
  queued: "Queued",
  reading: "Reading",
  schema_evolved: "Schema Evolved",
  counting: "Counting",
  ingesting: "Ingesting",
  completed: "Completed",
  failed: "Failed",
};

export const UploadPanel: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, progress, isComplete, isFailed } = useJobStatus(jobId || undefined);

  // Notify on completion / failure once
  useEffect(() => {
    if (isComplete && jobId) {
      toast({ title: "Ingestion complete" });
      onComplete?.();
      setJobId(null);
      setFile(null);
    }
    if (isFailed && status?.error) {
      toast({ title: "Ingestion failed", description: status.error, variant: "destructive" });
    }
  }, [isComplete, isFailed, status?.error, jobId]);

  const onDrop = (f: File) => {
    setFile(f);
  };

  const onSubmit = async () => {
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await request<{ job_id: string; skipped?: boolean }>("/upload", {
        method: "POST",
        body: fd,
      });
      if (res.skipped) {
        toast({ title: "Already ingested", description: file.name });
        setFile(null);
        return;
      }
      setJobId(res.job_id);
      toast({ title: "Upload started", description: file.name });
    } catch (e: any) {
      toast({ title: "Upload failed", description: String(e.message || e), variant: "destructive" });
    }
  };

  const bytes = (n?: number | null) => (n ? new Intl.NumberFormat().format(n) : "-");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) onDrop(e.dataTransfer.files[0]);
  };

  const handleBrowse = () => inputRef.current?.click();

  return (
    <Card className="glass-card liquid-scale">
      <CardHeader>
        <CardTitle>Upload CSV</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <motion.div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed rounded-md p-6 text-center glass-button transition-all duration-200 cursor-pointer liquid-bounce"
          onClick={handleBrowse}
          aria-label="Drop file here or click to browse"
          whileHover={{ scale: 1.02, borderColor: "hsl(var(--primary) / 0.5)" }}
          whileTap={{ scale: 0.98 }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv,application/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onDrop(e.target.files[0])}
          />
          <div className="text-sm text-muted-foreground">
            {file ? `Selected: ${file.name}` : "Drop a CSV file here, or click to browse"}
          </div>
        </motion.div>
        <div className="flex items-center gap-2">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={onSubmit} disabled={!file} className="liquid-bounce">Upload</Button>
          </motion.div>
          {file && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="secondary" onClick={() => setFile(null)} className="liquid-bounce">Clear</Button>
            </motion.div>
          )}
        </div>

        {status && (
          <motion.div 
            className="space-y-2 glass-float rounded-lg p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Progress value={progress} aria-label="Ingestion progress" />
            <div className="text-sm text-muted-foreground grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>Stage: <span className="font-medium">{status.stage ? stageLabel[status.stage] : status.status}</span></div>
              <div>Uploaded: {bytes(status.uploaded)} / {bytes(status.total ?? undefined)}</div>
              <div>Rows: {status.rows_processed ?? 0} / {status.rows_total ?? 0}</div>
              <div>Inserted: {status.rows_inserted ?? 0} · Skipped: {status.rows_skipped ?? 0}</div>
            </div>
            {isComplete && (
              <div className="text-sm">Complete.</div>
            )}
            {isFailed && (
              <div className="text-sm text-destructive">Failed: {status.error}</div>
            )}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
