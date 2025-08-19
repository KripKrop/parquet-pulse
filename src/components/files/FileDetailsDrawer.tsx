import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { X, Copy, Filter, Trash2, Calendar, HardDrive, Database, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { getFileDetails } from "@/services/filesApi";
import { formatBytes, formatDate, formatNumber } from "@/lib/formatters";

interface FileDetailsDrawerProps {
  fileId: string | null;
  open: boolean;
  onClose: () => void;
  onFilterByFile: (fileId: string) => void;
  onDelete: (fileId: string) => void;
}

export function FileDetailsDrawer({ 
  fileId, 
  open, 
  onClose, 
  onFilterByFile, 
  onDelete 
}: FileDetailsDrawerProps) {
  const { data: file, isLoading, error } = useQuery({
    queryKey: ["file", fileId],
    queryFn: () => fileId ? getFileDetails(fileId) : null,
    enabled: !!fileId,
    staleTime: 30000,
  });

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully`,
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const columnsMapEntries = file ? Object.entries(file.columns_map) : [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1 min-w-0">
              <SheetTitle className="text-xl font-bold text-gradient-primary truncate">
                {file?.filename || "File Details"}
              </SheetTitle>
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {file.ext?.toUpperCase()}
                  </Badge>
                  <span>•</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => copyToClipboard(file.file_id, "File ID")}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {file.file_id.slice(0, 8)}...
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}

          {error && (
            <Card className="border-destructive/50">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <div className="text-destructive font-medium">Failed to load file details</div>
                  <div className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : 'Unknown error occurred'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {file && (
            <>
              {/* Stats Overview */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="glass-float">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      File Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Current Rows</div>
                      <div className="text-2xl font-bold">
                        {formatNumber(file.current_row_count)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">File Size</div>
                      <div className="text-2xl font-bold">
                        {file.size_bytes ? formatBytes(file.size_bytes) : "—"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Uploaded</div>
                      <div className="text-sm font-medium">
                        {formatDate(file.uploaded_at, true)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Last Ingested</div>
                      <div className="text-sm font-medium">
                        {file.last_ingested_at ? formatDate(file.last_ingested_at, true) : "—"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Processing Details */}
              {(file.rows_total || file.rows_inserted || file.rows_skipped) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArrowRight className="h-5 w-5" />
                        Processing Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        {file.rows_total && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Total Rows</div>
                            <div className="text-lg font-semibold">
                              {formatNumber(file.rows_total)}
                            </div>
                          </div>
                        )}
                        {file.rows_inserted && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Inserted</div>
                            <div className="text-lg font-semibold text-green-600">
                              {formatNumber(file.rows_inserted)}
                            </div>
                          </div>
                        )}
                        {file.rows_skipped && (
                          <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Skipped</div>
                            <div className="text-lg font-semibold text-orange-600">
                              {formatNumber(file.rows_skipped)}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Column Mapping */}
              {columnsMapEntries.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Column Mapping
                        <Badge variant="outline" className="ml-2">
                          {columnsMapEntries.length} columns
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Original Column</TableHead>
                            <TableHead>Cleaned Column</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {columnsMapEntries.map(([original, cleaned], index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {original}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {cleaned}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Actions */}
              <motion.div
                className="flex gap-3 pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  onClick={() => {
                    onFilterByFile(file.file_id);
                    onClose();
                  }}
                  className="flex-1 button-smooth"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter Dataset
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => onDelete(file.file_id)}
                  className="button-smooth"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}