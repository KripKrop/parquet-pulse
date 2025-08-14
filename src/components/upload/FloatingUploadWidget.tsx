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
    file, 
    isUploading, 
    uploadProgress, 
    status, 
    progress, 
    isComplete, 
    isFailed, 
    clearUpload 
  } = useUpload();

  const shouldShow = file && (isUploading || status);
  const bytes = (n?: number | null) => (n ? new Intl.NumberFormat().format(n) : "-");

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
                {isComplete ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : isFailed ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4 text-primary" />
                  </motion.div>
                )}
                <span className="text-sm font-medium text-foreground">
                  {isComplete ? "Complete" : isFailed ? "Failed" : "Processing"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUpload}
                className="h-6 w-6 p-0 hover:bg-background/50"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* File name */}
            <div className="text-xs text-muted-foreground truncate">
              {file?.name}
            </div>

            {/* Progress during upload */}
            {isUploading && uploadProgress < 100 && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Progress value={uploadProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
              </motion.div>
            )}

            {/* Processing status */}
            {status && (
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {/* Stage progress */}
                {status.stage && !isComplete && !isFailed && (
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="text-xs"
                    >
                      ⭮
                    </motion.div>
                    <span className="text-xs font-medium text-primary">
                      {stageLabel[status.stage] || status.stage}
                    </span>
                  </div>
                )}

                {/* Processing progress */}
                {progress?.total_rows && progress.total_rows > 0 && (
                  <div className="space-y-1">
                    <Progress 
                      value={(progress.processed_rows / progress.total_rows) * 100} 
                      className="h-2" 
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        <AnimatedCounter value={progress.processed_rows} /> / {" "}
                        <AnimatedCounter value={progress.total_rows} /> rows
                      </span>
                      <span>
                        {Math.round((progress.processed_rows / progress.total_rows) * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Completion status */}
                {isComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-green-600 font-medium"
                  >
                    ✓ Successfully processed {bytes(progress?.inserted_rows)} rows
                  </motion.div>
                )}

                {/* Error status */}
                {isFailed && status.error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-600"
                  >
                    ❌ {status.error}
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}