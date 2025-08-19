import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useUpload } from "@/contexts/UploadContext";
import { FileSizeIndicator } from "@/components/ui/file-size-indicator";
import { UploadStatusBadge } from "@/components/ui/upload-status-badge";
import { formatBytes, formatTimeRemaining } from "@/utils/uploadValidation";

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

export const UploadPanel: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { 
    files,
    isUploading, 
    overallProgress,
    startUploads,
    setFiles,
    removeFile,
    clearUploads,
    cancelAllUploads,
    stats
  } = useUpload();
  
  const hasFiles = files.length > 0;
  const currentFile = files.find(f => 
    f.status === "uploading" || 
    f.status === "processing" || 
    f.status === "validating" ||
    (f.jobStatus && !f.isComplete && !f.isFailed && !f.isCancelled)
  ) || files.find(f => f.status === "pending") || files[0];

  // Listen for upload completion event to trigger onComplete only once
  useEffect(() => {
    const handleUploadsComplete = () => {
      onComplete?.();
    };
    
    window.addEventListener('uploadsComplete', handleUploadsComplete);
    return () => window.removeEventListener('uploadsComplete', handleUploadsComplete);
  }, [onComplete]);

  const onDrop = (newFiles: File[]) => {
    if (isUploading) return;
    setFiles(newFiles);
  };

  const onSubmit = async () => {
    if (!hasFiles || isUploading) return;
    await startUploads(files.map(f => f.file));
  };

  const bytes = (n?: number | null) => (n ? new Intl.NumberFormat().format(n) : "-");

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) onDrop(droppedFiles);
  };

  const handleBrowse = () => {
    if (isUploading) return;
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
                          hasFiles ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))"
            }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              initial={false}
              animate={{ opacity: hasFiles ? 0.3 : 0 }}
            />
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv,application/csv"
              className="hidden"
              disabled={isUploading}
              multiple
              onChange={(e) => {
                if (e.target.files && !isUploading) {
                  onDrop(Array.from(e.target.files));
                }
              }}
            />
            <motion.div 
              className="relative z-10"
              animate={{ 
                color: isUploading ? "hsl(var(--primary))" : 
                       hasFiles ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
              }}
            >
              <motion.div
                className="text-sm font-medium mb-2"
                animate={{ scale: hasFiles || isUploading ? 1.05 : 1 }}
                transition={{ duration: 0.2 }}
              >
                  {isUploading ? `🚀 Processing ${files.length} files...` :
                 hasFiles ? `✓ Selected: ${files.length} file${files.length > 1 ? 's' : ''}` : "📁 Drop CSV files here, or click to browse"}
                </motion.div>
                {isUploading && (
                  <motion.div
                    className="text-xs opacity-70 mt-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.7, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    Overall Progress: {Math.round(overallProgress)}% • Active: {stats.totalFiles - stats.completedFiles - stats.failedFiles - stats.cancelledFiles}
                    {stats.estimatedTimeRemaining > 0 && (
                      <> • ETA: {formatTimeRemaining(stats.estimatedTimeRemaining)}</>
                    )}
                  </motion.div>
                )}
              {!hasFiles && !isUploading && (
                <motion.div
                  className="text-xs opacity-70"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.7 }}
                  transition={{ delay: 0.2 }}
                >
                  Select multiple files for batch upload
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
                disabled={!hasFiles || isUploading} 
                className="liquid-bounce button-smooth hover-glow relative overflow-hidden"
                variant={hasFiles && !isUploading ? "default" : "secondary"}
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
                    Processing...
                  </>
                ) : (
                  <>🚀 Upload {hasFiles ? `${files.length} file${files.length > 1 ? 's' : ''}` : ''}</>
                )}
              </Button>
            </motion.div>
            {hasFiles && !isUploading && (
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
                  onClick={clearUploads} 
                  className="liquid-bounce hover:text-destructive"
                  disabled={isUploading}
                >
                  ✕ Clear All
                </Button>
              </motion.div>
            )}
            {isUploading && (
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Button 
                  variant="destructive" 
                  onClick={cancelAllUploads} 
                  className="liquid-bounce"
                >
                  ⏹ Cancel All
                </Button>
              </motion.div>
            )}
          </div>

          {/* File List */}
          {hasFiles && !isUploading && (
            <motion.div
              className="space-y-2 glass-float rounded-xl p-4 border border-primary/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-sm font-medium text-foreground mb-3">Selected Files:</div>
              {files.map((uploadFile, index) => (
                <motion.div
                  key={uploadFile.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:bg-background/70 transition-colors"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileSizeIndicator size={uploadFile.file.size} />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="text-sm truncate font-medium">{uploadFile.file.name}</span>
                      <div className="flex items-center gap-2">
                        <UploadStatusBadge status={uploadFile.status} />
                        {uploadFile.uploadSpeed > 0 && uploadFile.status === "uploading" && (
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(uploadFile.uploadSpeed)}/s
                          </span>
                        )}
                        {uploadFile.eta && uploadFile.eta > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ETA: {formatTimeRemaining(uploadFile.eta)}
                          </span>
                        )}
                      </div>
                      {uploadFile.uploadProgress > 0 && uploadFile.uploadProgress < 100 && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div 
                            className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${uploadFile.uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadFile.id)}
                    className="h-6 w-6 p-0 hover:text-destructive ml-2"
                    disabled={uploadFile.status === "uploading" || uploadFile.status === "processing"}
                  >
                    {uploadFile.status === "uploading" || uploadFile.status === "processing" ? "⏳" : "✕"}
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Overall Progress Bar */}
          {isUploading && files.some(f => f.status !== "completed" && f.status !== "failed" && f.status !== "cancelled") && (
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
                  <Progress value={overallProgress} aria-label="Overall progress" className="h-3" />
                </motion.div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="text-primary font-medium">
                      Processing {stats.totalFiles - stats.completedFiles - stats.failedFiles - stats.cancelledFiles} of {files.length} files
                    </span>
                    {stats.averageSpeed > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Speed: {formatBytes(stats.averageSpeed)}/s
                        {stats.estimatedTimeRemaining > 0 && (
                          <> • {formatTimeRemaining(stats.estimatedTimeRemaining)} remaining</>
                        )}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground font-bold">{Math.round(overallProgress)}%</span>
                </div>
              </div>
            </motion.div>
          )}

          {currentFile?.jobStatus && (currentFile.status === "processing" || currentFile.jobStatus.stage) && (
            <motion.div 
              className="space-y-4 glass-float rounded-xl p-5 border border-primary/20 relative overflow-hidden"
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
              <div className="relative z-10 space-y-4">
                {/* Progress Bar Section */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  className="origin-left space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <motion.div 
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <span className="text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-full font-medium">
                        {currentFile.jobStatus?.stage ? stageLabel[currentFile.jobStatus.stage] : currentFile.jobStatus?.status}
                      </span>
                    </motion.div>
                    <motion.span 
                      className="text-sm font-medium text-primary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {((currentFile.jobStatus?.progress || 0) * 100).toFixed(1)}%
                    </motion.span>
                  </div>
                  <Progress value={(currentFile.jobStatus?.progress || 0) * 100} aria-label="Processing progress" className="h-3" />
                </motion.div>

                {/* Status Information Grid */}
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {/* Upload Status */}
                  <motion.div 
                    className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="text-xs text-muted-foreground mb-1">Data Uploaded</div>
                    <div className="font-medium">
                      {bytes(currentFile.jobStatus?.uploaded)} / {bytes(currentFile.jobStatus?.total ?? undefined)}
                    </div>
                  </motion.div>

                  {/* Row Processing Status */}
                  <motion.div 
                    className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="text-xs text-muted-foreground mb-1">Rows Processed</div>
                    <div className="font-medium">
                      {currentFile.jobStatus?.rows_processed ?? 0} / {currentFile.jobStatus?.rows_total ?? 0}
                    </div>
                  </motion.div>

                  {/* Insert Status */}
                  <motion.div 
                    className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="text-xs text-muted-foreground mb-1">Rows Inserted</div>
                    <div className="font-medium text-green-600">
                      {currentFile.jobStatus?.rows_inserted ?? 0}
                    </div>
                  </motion.div>

                  {/* Skip Status */}
                  <motion.div 
                    className="bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/50"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="text-xs text-muted-foreground mb-1">Rows Skipped</div>
                    <div className="font-medium text-amber-600">
                      {currentFile.jobStatus?.rows_skipped ?? 0}
                    </div>
                  </motion.div>
                </motion.div>

                {/* Completion Status */}
                {!isUploading && files.length > 0 && (
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {files.every(f => f.isComplete) && (
                      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
                        <div className="text-green-600 text-lg">✅</div>
                        <div>
                          <div className="font-medium text-green-800 dark:text-green-200">All Files Complete!</div>
                          <div className="text-sm text-green-600 dark:text-green-400">
                            Successfully processed {files.length} file{files.length > 1 ? 's' : ''}.
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {files.some(f => f.isFailed) && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                        <div className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                          Some files failed to process:
                        </div>
                        {files.filter(f => f.isFailed).map((failedFile, index) => (
                          <div key={index} className="text-sm text-amber-600 dark:text-amber-400">
                            • {failedFile.file.name}
                          </div>
                        ))}
                      </div>
                    )}
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
