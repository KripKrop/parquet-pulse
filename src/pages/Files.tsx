import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { File, Calendar, HardDrive, Eye, Filter, Trash2, Copy, RefreshCw, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { listFiles } from "@/services/filesApi";
import { formatBytes, formatDate, getRelativeTime, formatNumber } from "@/lib/formatters";
import { FileDetailsDrawer } from "@/components/files/FileDetailsDrawer";
import { DeleteFileDialog } from "@/components/files/DeleteFileDialog";
import { useNavigate } from "react-router-dom";

export default function Files() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: filesData, isLoading, error, refetch } = useQuery({
    queryKey: ["files"],
    queryFn: listFiles,
    staleTime: 30000,
    gcTime: 300000,
    refetchInterval: 60000, // Refresh every minute
  });

  const files = filesData?.files || [];

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

  const handleFilterByFile = (fileId: string) => {
    // Navigate to main page with file filter applied
    navigate(`/?files=${fileId}`);
  };

  const totalFiles = files.length;
  const totalRows = files.reduce((sum, file) => sum + file.current_row_count, 0);
  const totalSize = files.reduce((sum, file) => sum + (file.size_bytes || 0), 0);

  if (error) {
    return (
      <motion.div 
        className="container mx-auto px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <div className="text-destructive font-medium">Failed to load files</div>
              <div className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="container mx-auto px-4 py-8 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-gradient-primary">Files</h1>
          <p className="text-muted-foreground mt-1">
            Manage your uploaded files and dataset sources
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="button-smooth">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass-float">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <File className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatNumber(totalFiles)}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-float">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatNumber(totalRows)}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-float">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
                <div className="text-sm text-muted-foreground">Total Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Files Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass-table">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <File className="h-5 w-5" />
              Files Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <File className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">No files uploaded yet</div>
                  <div className="text-sm text-muted-foreground">
                    Upload your first CSV file to get started
                  </div>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {files.map((file, index) => (
                      <motion.tr
                        key={file.file_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className="group hover:bg-accent/30 transition-colors duration-200"
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{file.filename}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{file.ext?.toUpperCase()}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 px-1 text-xs"
                                onClick={() => copyToClipboard(file.file_id, "File ID")}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                ID
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="text-sm">{getRelativeTime(file.uploaded_at)}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {formatDate(file.uploaded_at, true)}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {file.size_bytes ? formatBytes(file.size_bytes) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatNumber(file.current_row_count)}
                            </div>
                            {file.rows_total && file.rows_total !== file.current_row_count && (
                              <div className="text-xs text-muted-foreground">
                                of {formatNumber(file.rows_total)} total
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={file.current_row_count > 0 ? "default" : "secondary"}>
                            {file.current_row_count > 0 ? "Active" : "Empty"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedFileId(file.file_id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleFilterByFile(file.file_id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Filter className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Filter Dataset</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteFileId(file.file_id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete File</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* File Details Drawer */}
      <FileDetailsDrawer
        fileId={selectedFileId}
        open={!!selectedFileId}
        onClose={() => setSelectedFileId(null)}
        onFilterByFile={handleFilterByFile}
        onDelete={(fileId) => {
          setSelectedFileId(null);
          setDeleteFileId(fileId);
        }}
      />

      {/* Delete File Dialog */}
      <DeleteFileDialog
        fileId={deleteFileId}
        open={!!deleteFileId}
        onClose={() => setDeleteFileId(null)}
        onSuccess={() => {
          refetch();
          setDeleteFileId(null);
        }}
      />
    </motion.div>
  );
}