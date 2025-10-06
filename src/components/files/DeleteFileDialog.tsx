import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, FileX, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "@/hooks/use-toast";
import { deleteFileDryRun, deleteFileConfirm, getFileDetails } from "@/services/filesApi";
import { formatNumber } from "@/lib/formatters";

interface DeleteFileDialogProps {
  fileId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteFileDialog({ fileId, open, onClose, onSuccess }: DeleteFileDialogProps) {
  const [step, setStep] = useState<'dry-run' | 'confirm'>('dry-run');
  const [confirmText, setConfirmText] = useState('');
  const [dropFileRecord, setDropFileRecord] = useState(true);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('dry-run');
      setConfirmText('');
      setDropFileRecord(true);
      setDryRunResult(null);
    }
  }, [open, fileId]);

  // Get file details
  const { data: file } = useQuery({
    queryKey: ["file", fileId],
    queryFn: () => fileId ? getFileDetails(fileId) : null,
    enabled: !!fileId && open,
  });

  // Dry run mutation
  const dryRunMutation = useMutation({
    mutationFn: (fileId: string) => deleteFileDryRun(fileId),
    onSuccess: (result) => {
      setDryRunResult(result);
      setStep('confirm');
    },
    onError: (error: any) => {
      const message = error?.message || "Could not determine deletion impact";
      toast({
        title: "Dry run failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Delete confirmation mutation
  const deleteMutation = useMutation({
    mutationFn: ({ fileId, matched }: { fileId: string; matched: number }) => 
      deleteFileConfirm(fileId, matched, dropFileRecord),
    onSuccess: (result) => {
      toast({
        title: "File deleted successfully",
        description: `Deleted ${formatNumber(result.deleted)} rows${
          result.dropped_columns.length > 0 
            ? `. Dropped columns: ${result.dropped_columns.join(', ')}`
            : ''
        }`,
      });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error?.message || "Could not delete file";
      
      if (message.includes('expected_min/expected_max mismatch') || message.includes('Data changed')) {
        toast({
          title: "Data changed since dry run",
          description: "Please retry the dry run as the data has been modified",
          variant: "destructive",
        });
        setStep('dry-run');
        setDryRunResult(null);
      } else if (message.includes('Database is busy')) {
        toast({
          title: "Database is busy",
          description: "Please try again in a moment",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Deletion failed",
          description: message,
          variant: "destructive",
        });
      }
    },
  });

  const handleDryRun = () => {
    if (!fileId) return;
    dryRunMutation.mutate(fileId);
  };

  const handleConfirmDelete = () => {
    if (!fileId || !dryRunResult || !file) return;
    if (confirmText !== file.filename) {
      toast({
        title: "Filename mismatch",
        description: "Please type the exact filename to confirm deletion",
        variant: "destructive",
      });
      return;
    }
    deleteMutation.mutate({ fileId, matched: dryRunResult.matched });
  };

  const isConfirmDisabled = !file || confirmText !== file.filename;
  const isLoading = dryRunMutation.isPending || deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete File
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please review the impact before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {file && (
            <Card className="border-muted">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="font-medium">{file.filename}</div>
                  <div className="text-sm text-muted-foreground">
                    Current rows: {formatNumber(file.current_row_count)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <AnimatePresence mode="wait">
            {step === 'dry-run' && (
              <motion.div
                key="dry-run"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <Card className="border-orange-200 dark:border-orange-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
                      <Database className="h-5 w-5" />
                      Impact Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      First, we'll analyze what data would be affected by this deletion.
                    </p>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="drop-record"
                        checked={dropFileRecord}
                        onCheckedChange={(checked) => setDropFileRecord(!!checked)}
                      />
                      <Label htmlFor="drop-record" className="text-sm">
                        Also remove file record from files table
                      </Label>
                    </div>

                    <Button
                      onClick={handleDryRun}
                      disabled={isLoading || !fileId}
                      className="w-full"
                      variant="outline"
                    >
                      {dryRunMutation.isPending ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 mr-2" />
                      )}
                      Analyze Impact
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === 'confirm' && dryRunResult && file && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Card className="border-destructive/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                      <FileX className="h-5 w-5" />
                      Deletion Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-destructive/10 p-3 rounded-lg">
                      <div className="font-semibold text-destructive">
                        {formatNumber(dryRunResult.matched)} rows will be deleted
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        from file: {dryRunResult.filename}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label htmlFor="confirm-filename" className="text-sm font-medium">
                        Type the filename to confirm:
                      </Label>
                      <Input
                        id="confirm-filename"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={file.filename}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Type: <span className="font-mono bg-muted px-1 rounded">{file.filename}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="drop-record-confirm"
                        checked={dropFileRecord}
                        onCheckedChange={(checked) => setDropFileRecord(!!checked)}
                      />
                      <Label htmlFor="drop-record-confirm" className="text-sm">
                        Remove file record from files table
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('dry-run');
                      setDryRunResult(null);
                    }}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    disabled={isConfirmDisabled || isLoading}
                    className="flex-1"
                  >
                    {deleteMutation.isPending ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete Forever
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}