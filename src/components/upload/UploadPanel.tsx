import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { request, getApiConfig } from "@/services/apiClient";
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, progress, isComplete, isFailed } = useJobStatus(jobId || undefined);

  // Notify on completion / failure once
  useEffect(() => {
    if (isComplete && jobId) {
      toast({ title: "Ingestion complete" });
      onComplete?.();
      setJobId(null);
      setFile(null);
      setIsUploading(false);
      setUploadProgress(0);
    }
    if (isFailed && status?.error) {
      toast({ title: "Ingestion failed", description: status.error, variant: "destructive" });
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [isComplete, isFailed, status?.error, jobId]);

  const onDrop = (f: File) => {
    setFile(f);
  };

  const onSubmit = async () => {
    if (!file || isUploading) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const fd = new FormData();
      fd.append("file", file);
      
      // Create XMLHttpRequest for upload progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ job_id: string; skipped?: boolean }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        const { baseUrl, apiKey } = getApiConfig();
        const uploadUrl = `${baseUrl.replace(/\/$/, '')}/upload`;
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('x-api-key', apiKey);
        xhr.send(fd);
      });
      
      const res = await uploadPromise;
      
      if (res.skipped) {
        toast({ title: "Already ingested", description: file.name });
        setFile(null);
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
      
      setJobId(res.job_id);
      toast({ title: "Upload completed", description: "Processing started..." });
      setUploadProgress(100);
      
    } catch (e: any) {
      toast({ title: "Upload failed", description: String(e.message || e), variant: "destructive" });
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const bytes = (n?: number | null) => (n ? new Intl.NumberFormat().format(n) : "-");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return; // Prevent new file selection during upload
    if (e.dataTransfer.files?.[0]) onDrop(e.dataTransfer.files[0]);
  };

  const handleBrowse = () => {
    if (isUploading) return; // Prevent browsing during upload
    inputRef.current?.click();
  };

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
            className={`border-2 border-dashed rounded-lg p-8 text-center glass-button transition-all duration-300 liquid-bounce relative overflow-hidden group ${
              isUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
            }`}
            onClick={handleBrowse}
            aria-label="Drop file here or click to browse"
            whileHover={!isUploading ? { 
              scale: 1.02, 
              borderColor: "hsl(var(--primary) / 0.6)",
              boxShadow: "0 10px 40px -10px hsl(var(--primary) / 0.3)"
            } : {}}
            whileTap={!isUploading ? { scale: 0.98 } : {}}
            initial={{ borderColor: "hsl(var(--border))" }}
            animate={{ 
              borderColor: isUploading ? "hsl(var(--primary) / 0.8)" : 
                          file ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))"
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
              disabled={isUploading}
              onChange={(e) => e.target.files?.[0] && !isUploading && onDrop(e.target.files[0])}
            />
            <motion.div 
              className="relative z-10"
              animate={{ 
                color: isUploading ? "hsl(var(--primary))" : 
                       file ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
              }}
            >
              <motion.div
                className="text-sm font-medium mb-2"
                animate={{ scale: file || isUploading ? 1.05 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {isUploading ? `🚀 Uploading: ${file?.name}` :
                 file ? `✓ Selected: ${file.name}` : "📁 Drop a CSV file here, or click to browse"}
              </motion.div>
              {isUploading && (
                <motion.div
                  className="text-xs opacity-70 mt-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.7, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  Upload Progress: {Math.round(uploadProgress)}%
                </motion.div>
              )}
              {!file && !isUploading && (
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
                disabled={!file || isUploading} 
                className="liquid-bounce button-smooth hover-glow relative overflow-hidden"
                variant={file && !isUploading ? "default" : "secondary"}
              >
                {isUploading ? (
                  <>
                    <motion.div
                      className="mr-2"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      ⭮
                    </motion.div>
                    Uploading...
                  </>
                ) : (
                  <>🚀 Upload</>
                )}
              </Button>
            </motion.div>
            {file && !isUploading && (
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
                  disabled={isUploading}
                >
                  ✕ Clear
                </Button>
              </motion.div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && uploadProgress < 100 && (
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
                  <Progress value={uploadProgress} aria-label="Upload progress" className="h-3" />
                </motion.div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-primary font-medium">Uploading file...</span>
                  <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
                </div>
              </div>
            </motion.div>
          )}

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
