import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  File, Calendar, HardDrive, Eye, Filter, Trash2, Copy, RefreshCw, Database,
  Search, ArrowUp, ArrowDown, ArrowUpDown, Download, GitCompare, X
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { FileCard } from "@/components/files/FileCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { listFiles } from "@/services/filesApi";
import { formatBytes, formatDate, getRelativeTime, formatNumber } from "@/lib/formatters";
import { FileDetailsDrawer } from "@/components/files/FileDetailsDrawer";
import { DeleteFileDialog } from "@/components/files/DeleteFileDialog";
import { FileComparisonDialog } from "@/components/files/FileComparisonDialog";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { exportToCSV } from "@/utils/csvExport";

type SortKey = "filename" | "uploaded_at" | "size_bytes" | "current_row_count";

export default function Files() {
  const isMobile = useIsMobile();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("uploaded_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);
  const navigate = useNavigate();
  const debouncedSearch = useDebounce(searchQuery, 200);

  const { data: filesData, isLoading, error, refetch } = useQuery({
    queryKey: ["files"],
    queryFn: listFiles,
    staleTime: 30000,
    gcTime: 300000,
    refetchInterval: 60000,
  });

  const files = filesData?.files || [];

  // Clear selection when search changes
  useEffect(() => {
    setSelectedFileIds(new Set());
  }, [debouncedSearch]);

  // Filter and sort
  const processedFiles = useMemo(() => {
    let result = files;

    // Filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(f => f.filename.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [files, debouncedSearch, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = processedFiles.map(f => f.file_id);
    const allSelected = visibleIds.every(id => selectedFileIds.has(id));
    if (allSelected) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(visibleIds));
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: `${label} copied successfully` });
    } catch {
      toast({ title: "Failed to copy", description: "Could not copy to clipboard", variant: "destructive" });
    }
  };

  const handleFilterByFile = (fileId: string) => {
    navigate(`/?files=${fileId}`);
  };

  const handleBulkFilter = () => {
    const ids = Array.from(selectedFileIds).join(",");
    navigate(`/?files=${ids}`);
  };

  const handleExportMetadata = () => {
    const selected = files.filter(f => selectedFileIds.has(f.file_id));
    const rows = selected.map(f => ({
      file_id: f.file_id,
      filename: f.filename,
      uploaded_at: f.uploaded_at,
      size_bytes: f.size_bytes ?? "",
      current_row_count: f.current_row_count,
      columns: Object.keys(f.columns_map || {}).join("; "),
    }));
    exportToCSV(rows, ["file_id", "filename", "uploaded_at", "size_bytes", "current_row_count", "columns"], "files-metadata.csv");
    toast({ title: "Exported", description: `${selected.length} file(s) metadata exported` });
  };

  const selectedCount = selectedFileIds.size;
  const visibleIds = processedFiles.map(f => f.file_id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedFileIds.has(id));
  const someSelected = visibleIds.some(id => selectedFileIds.has(id));

  // Comparison
  const canCompare = selectedCount === 2;
  const comparisonFiles = canCompare
    ? Array.from(selectedFileIds).map(id => files.find(f => f.file_id === id)!).filter(Boolean)
    : [];

  const totalFiles = files.length;
  const totalRows = files.reduce((sum, file) => sum + file.current_row_count, 0);
  const totalSize = files.reduce((sum, file) => sum + (file.size_bytes || 0), 0);

  if (error) {
    return (
      <motion.div className="container mx-auto px-4 py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <div className="text-destructive font-medium">Failed to load files</div>
              <div className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Unknown error occurred"}
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
          <p className="text-muted-foreground mt-1">Manage your uploaded files and dataset sources</p>
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

      {/* Search & Bulk Actions Toolbar */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {debouncedSearch && (
          <Badge variant="secondary" className="text-xs">
            {processedFiles.length} result{processedFiles.length !== 1 ? "s" : ""}
          </Badge>
        )}

        {/* Bulk actions */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              className="flex items-center gap-2 flex-wrap"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Badge variant="outline">{selectedCount} selected</Badge>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleBulkFilter}>
                    <Filter className="h-3.5 w-3.5 mr-1" />
                    Filter
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Filter dataset by selected files</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={handleExportMetadata}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export metadata as CSV</TooltipContent>
              </Tooltip>

              {canCompare && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
                      <GitCompare className="h-3.5 w-3.5 mr-1" />
                      Compare
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Compare schemas of 2 selected files</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      // Delete first selected file (one at a time)
                      const firstId = Array.from(selectedFileIds)[0];
                      if (firstId) setDeleteFileId(firstId);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete selected files (one at a time)</TooltipContent>
              </Tooltip>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFileIds(new Set())}
                className="text-xs"
              >
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
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
                    <Skeleton className="h-4 w-6" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : processedFiles.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <File className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">
                    {debouncedSearch ? "No files match your search" : "No files uploaded yet"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {debouncedSearch ? "Try a different search term" : "Upload your first CSV file to get started"}
                  </div>
                </div>
              </div>
            ) : isMobile ? (
              /* ─── Mobile card layout ─── */
              <div className="p-3 space-y-3">
                {processedFiles.map((file, index) => (
                  <FileCard
                    key={file.file_id}
                    file={file}
                    selected={selectedFileIds.has(file.file_id)}
                    onToggleSelect={() => toggleFileSelection(file.file_id)}
                    onView={() => setSelectedFileId(file.file_id)}
                    onFilter={() => handleFilterByFile(file.file_id)}
                    onDelete={() => setDeleteFileId(file.file_id)}
                    onCopy={copyToClipboard}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allVisibleSelected}
                        ref={(el) => {
                          if (el) {
                            (el as any).indeterminate = someSelected && !allVisibleSelected;
                          }
                        }}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort("filename")}
                    >
                      <span className="inline-flex items-center">
                        File <SortIcon col="filename" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort("uploaded_at")}
                    >
                      <span className="inline-flex items-center">
                        Uploaded <SortIcon col="uploaded_at" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort("size_bytes")}
                    >
                      <span className="inline-flex items-center">
                        Size <SortIcon col="size_bytes" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:text-foreground transition-colors"
                      onClick={() => handleSort("current_row_count")}
                    >
                      <span className="inline-flex items-center">
                        Rows <SortIcon col="current_row_count" />
                      </span>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {processedFiles.map((file, index) => (
                      <motion.tr
                        key={file.file_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group hover:bg-accent/30 transition-colors duration-200 ${
                          selectedFileIds.has(file.file_id) ? "bg-accent/20" : ""
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedFileIds.has(file.file_id)}
                            onCheckedChange={() => toggleFileSelection(file.file_id)}
                            aria-label={`Select ${file.filename}`}
                          />
                        </TableCell>
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
                            <TooltipContent>{formatDate(file.uploaded_at, true)}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {file.size_bytes ? formatBytes(file.size_bytes) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{formatNumber(file.current_row_count)}</div>
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
                                <Button variant="ghost" size="sm" onClick={() => setSelectedFileId(file.file_id)} className="h-8 w-8 p-0">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleFilterByFile(file.file_id)} className="h-8 w-8 p-0">
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
          setSelectedFileIds(prev => {
            if (deleteFileId) {
              const next = new Set(prev);
              next.delete(deleteFileId);
              return next;
            }
            return prev;
          });
        }}
      />

      {/* File Comparison Dialog */}
      {canCompare && comparisonFiles.length === 2 && (
        <FileComparisonDialog
          fileA={comparisonFiles[0]}
          fileB={comparisonFiles[1]}
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </motion.div>
  );
}
