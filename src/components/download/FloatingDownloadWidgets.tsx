import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDownload } from "@/contexts/DownloadContext";
import { X, Download, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

export function FloatingDownloadWidgets() {
  const { downloads, cancelDownload, removeDownload, clearCompleted } = useDownload();

  if (downloads.length === 0) return null;

  const activeDownloads = downloads.filter(d => d.status === 'downloading');
  const completedDownloads = downloads.filter(d => d.status === 'completed' || d.status === 'failed' || d.status === 'cancelled');

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
        style={{ bottom: "7rem" }} // Stack above upload widget
      >
        <div className="flex flex-col gap-4">
          {/* Clear completed button */}
          {completedDownloads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-end"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={clearCompleted}
                className="text-xs backdrop-blur-xl bg-background/50 border-primary/20 hover:bg-background/70"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear completed
              </Button>
            </motion.div>
          )}

          {/* Completed downloads stack */}
          {completedDownloads.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative min-h-[80px]"
            >
              {completedDownloads.map((download, index) => (
                <motion.div
                  key={download.id}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ 
                    opacity: index === 0 ? 1 : Math.max(0.4, 0.8 - (index * 0.15)),
                    y: index * -6,
                    scale: Math.max(0.92, 1 - (index * 0.03)),
                    zIndex: completedDownloads.length - index
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.9 }}
                  style={{
                    position: index === 0 ? 'relative' : 'absolute',
                    top: index === 0 ? 0 : 0,
                    left: index === 0 ? 0 : `${index * 3}px`,
                    right: index === 0 ? 0 : `${index * 3}px`,
                    transformOrigin: 'bottom center'
                  }}
                  className="w-full"
                >
                  <Card className="glass-card border border-primary/20 shadow-lg overflow-hidden backdrop-blur-xl hover:shadow-xl transition-shadow duration-300">
                    <div className="relative z-10 p-3 space-y-2">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {download.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : download.status === 'failed' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <X className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {download.status === 'completed' ? "Downloaded" : 
                             download.status === 'failed' ? "Failed" : "Cancelled"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDownload(download.id)}
                          className="h-6 w-6 p-0 hover:bg-background/50 opacity-70 hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* File name - only show on top card */}
                      {index === 0 && (
                        <div className="text-xs text-muted-foreground truncate">
                          {download.filename}
                        </div>
                      )}

                      {/* Status - only show on top card */}
                      {index === 0 && (
                        <>
                          {download.status === 'completed' && (
                            <div className="text-xs text-green-600 font-medium">
                              ✓ Downloaded {new Intl.NumberFormat().format(download.totalRows)} rows
                            </div>
                          )}

                          {download.status === 'failed' && download.error && (
                            <div className="text-xs text-red-600">
                              ❌ {download.error}
                            </div>
                          )}

                          {download.status === 'cancelled' && (
                            <div className="text-xs text-yellow-600">
                              ⚠️ Download cancelled
                            </div>
                          )}
                        </>
                      )}

                      {/* Stack indicator */}
                      {index === 0 && completedDownloads.length > 1 && (
                        <div className="text-xs text-muted-foreground/60 text-right">
                          +{completedDownloads.length - 1} more
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Active downloads - properly spaced */}
          <div className="flex flex-col gap-4">
            {activeDownloads.map((download, index) => (
              <motion.div
                key={download.id}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { delay: index * 0.1 }
                }}
                exit={{ opacity: 0, y: 50, scale: 0.8 }}
                layout
                className="relative"
              >
                <Card className="glass-card border border-primary/20 shadow-2xl overflow-hidden backdrop-blur-xl">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-500/10"
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
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <Download className="h-4 w-4 text-blue-500" />
                        </motion.div>
                        <span className="text-sm font-medium text-foreground">
                          Downloading
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelDownload(download.id)}
                          className="h-6 w-6 p-0 hover:bg-red-500/20"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDownload(download.id)}
                          className="h-6 w-6 p-0 hover:bg-background/50"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* File name */}
                    <div className="text-xs text-muted-foreground truncate">
                      {download.filename}
                    </div>

                    {/* Progress */}
                    <motion.div 
                      className="space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Progress value={undefined} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            className="text-xs"
                          >
                            ⭮
                          </motion.div>
                          Downloading...
                        </span>
                        <span>
                          <AnimatedCounter value={download.totalRows} /> rows
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}