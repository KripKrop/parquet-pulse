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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className="glass-card liquid-scale border-0 shadow-lg">
        <CardHeader className="pb-3">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <CardTitle className="text-gradient-primary">Upload CSV</CardTitle>
          </motion.div>
        </CardHeader>
        <CardContent className="space-y-4">
          <motion.div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed rounded-lg p-8 text-center glass-button transition-all duration-300 cursor-pointer liquid-bounce relative overflow-hidden group"
            onClick={handleBrowse}
            aria-label="Drop file here or click to browse"
            whileHover={{ 
              scale: 1.02, 
              borderColor: "hsl(var(--primary) / 0.6)",
              boxShadow: "0 10px 40px -10px hsl(var(--primary) / 0.3)"
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ borderColor: "hsl(var(--border))" }}
            animate={{ 
              borderColor: file ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))"
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={false}
              animate={{ opacity: file ? 0.3 : 0 }}
            />
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,application/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onDrop(e.target.files[0])}
            />
            <motion.div 
              className="relative z-10"
              animate={{ 
                color: file ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
              }}
            >
              <motion.div
                className="text-sm font-medium mb-2"
                animate={{ scale: file ? 1.05 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {file ? `✓ Selected: ${file.name}` : "📁 Drop a CSV file here, or click to browse"}
              </motion.div>
              {!file && (
                <motion.div
                  className="text-xs opacity-70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 0.2 }}
                >
                  Drag & drop for fastest upload
                </motion.div>
              )}
            </motion.div>
          </motion.div>
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Button 
                onClick={onSubmit} 
                disabled={!file} 
                className="liquid-bounce button-smooth hover-glow"
                variant={file ? "default" : "secondary"}
              >
                🚀 Upload
              </Button>
            </motion.div>
            {file && (
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Button 
                  variant="ghost" 
                  onClick={() => setFile(null)} 
                  className="liquid-bounce hover:text-destructive"
                >
                  ✕ Clear
                </Button>
              </motion.div>
            )}
          </div>

          {status && (
            <motion.div 
              className="space-y-3 glass-float rounded-xl p-4 border border-primary/20 relative overflow-hidden"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                animate={{
                  x: ["-100%", "100%"],
                  opacity: [0, 0.5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <div className="relative z-10">
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  className="origin-left"
                >
                  <Progress value={progress} aria-label="Ingestion progress" className="h-2" />
                </motion.div>
                <div className="text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                  <motion.div 
                    className="flex items-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">Stage</span>
                    <span className="font-medium">{status.stage ? stageLabel[status.stage] : status.status}</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="text-xs">Uploaded:</span> {bytes(status.uploaded)} / {bytes(status.total ?? undefined)}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <span className="text-xs">Rows:</span> {status.rows_processed ?? 0} / {status.rows_total ?? 0}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="text-xs">Inserted:</span> {status.rows_inserted ?? 0} · <span className="text-xs">Skipped:</span> {status.rows_skipped ?? 0}
                  </motion.div>
                </div>
                {isComplete && (
                  <motion.div 
                    className="text-sm font-medium text-primary flex items-center gap-2 mt-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    ✅ Complete!
                  </motion.div>
                )}
                {isFailed && (
                  <motion.div 
                    className="text-sm text-destructive font-medium flex items-center gap-2 mt-2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    ❌ Failed: {status.error}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
