import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUpload } from "@/contexts/UploadContext";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

const stageLabel: Record<string, string> = {
  uploading: "Uploading",
  queued: "Queued",
  reading: "Reading",
  schema_evolved: "Schema Evolved",
  counting: "Counting",
  ingesting: "Ingesting",
  completed: "Completed",
  failed: "Failed",
};

export function FloatingUploadWidget() {
  const { 
    files,
    isUploading, 
    overallProgress,
    clearUploads,
    stats 
  } = useUpload();

  const currentFile = files.find(f => f.status === "uploading" || f.status === "processing") || files[0];
  const shouldShow = files.length > 0 && (isUploading || files.some(f => f.jobStatus));
  const bytes = (n?: number | null) => (n ? new Intl.NumberFormat().format(n) : "-");
  
  const completedFiles = stats.completedFiles;
  const failedFiles = stats.failedFiles;
  const isAllComplete = !isUploading && files.length > 0 && files.every(f => f.isComplete || f.isFailed);

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.8 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.4 
        }}
        className="fixed bottom-6 right-6 z-50 max-w-sm"
      >
        <Card className="glass-card border border-primary/20 shadow-2xl overflow-hidden backdrop-blur-xl">
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10"
            animate={{
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <div className="relative z-10 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAllComplete ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : failedFiles > 0 && !isUploading ? (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4 text-primary" />
                  </motion.div>
                )}
                <span className="text-sm font-medium text-foreground">
                  {isAllComplete ? "Complete" : 
                   failedFiles > 0 && !isUploading ? "Partial" : 
                   "Processing"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUploads}
                className="h-6 w-6 p-0 hover:bg-background/50"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Status summary */}
            <div className="text-xs text-muted-foreground">
              {isUploading ? 
                `Processing ${stats.totalFiles - stats.completedFiles - stats.failedFiles - stats.cancelledFiles} of ${files.length} files` :
                `${completedFiles} of ${files.length} files completed ${failedFiles > 0 ? `(${failedFiles} failed)` : ''}`
              }
            </div>

            {/* Overall progress */}
            {(isUploading || isAllComplete) && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Progress value={overallProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{isUploading ? "Processing..." : "Complete"}</span>
                  <span>{Math.round(overallProgress)}%</span>
                </div>
              </motion.div>
            )}

            {/* Current file processing status */}
            {currentFile?.jobStatus && isUploading && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {/* Current stage */}
                {currentFile.jobStatus.stage && (
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="text-xs"
                    >
                      ⭮
                    </motion.div>
                    <span className="text-xs font-medium text-primary">
                      {stageLabel[currentFile.jobStatus.stage] || currentFile.jobStatus.stage}
                    </span>
                  </div>
                )}

                {/* Current file progress */}
                {currentFile.jobStatus.rows_total && currentFile.jobStatus.rows_total > 0 && (
                  <div className="space-y-1">
                    <Progress 
                      value={((currentFile.jobStatus.rows_processed || 0) / currentFile.jobStatus.rows_total) * 100} 
                      className="h-2" 
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        <AnimatedCounter value={currentFile.jobStatus.rows_processed || 0} /> / {" "}
                        <AnimatedCounter value={currentFile.jobStatus.rows_total} /> rows
                      </span>
                      <span>
                        {Math.round(((currentFile.jobStatus.rows_processed || 0) / currentFile.jobStatus.rows_total) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Final status */}
            {isAllComplete && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-medium"
              >
                {failedFiles > 0 ? (
                  <span className="text-amber-600">
                    ⚠️ {completedFiles} completed, {failedFiles} failed
                  </span>
                ) : (
                  <span className="text-green-600">
                    ✓ All {completedFiles} files processed successfully
                  </span>
                )}
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}