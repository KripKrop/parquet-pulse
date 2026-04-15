import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { request } from "@/services/apiClient";
import type { ColumnsResponse } from "@/types/api";
import { toast } from "@/hooks/use-toast";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { FiltersPanel, type Filters } from "@/components/filters/FiltersPanel";
import { DataTable } from "@/components/table/DataTable";
import { DownloadCsv } from "@/components/download/DownloadCsv";
import { FileMultiSelect } from "@/components/files/FileMultiSelect";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BulkDeleteDialog } from "@/components/delete/BulkDeleteDialog";
import { ColumnSettings } from "@/components/table/ColumnSettings";
import { RowDetailModal } from "@/components/table/RowDetailModal";
import { KeyboardShortcutsDialog } from "@/components/table/KeyboardShortcutsDialog";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { decodeFilters } from "@/utils/filterEncoding";
import { useAuth } from "@/contexts/AuthContext";
import { useColumnSettings } from "@/hooks/useColumnSettings";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  
  const { data: colsData, refetch: refetchCols } = useQuery({
    queryKey: ["columns"],
    queryFn: async () => {
      const response: any = await request<ColumnsResponse>("/columns");
      return {
        columns: response.columns,
        datasetVersion: response._headers?.get("X-Dataset-Version") || undefined
      };
    },
    enabled: isAuthenticated,
  });

  const [filters, setFilters] = useState<Filters>({});
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [datasetVersion, setDatasetVersion] = useState<string | undefined>();
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<{ row: Record<string, any>; index: number } | null>(null);
  const [rowsSnapshot, setRowsSnapshot] = useState<Record<string, any>[]>([]);

  const columns = colsData?.columns ?? [];

  const {
    visibleColumns,
    columnOrder,
    pinnedColumns,
    orderedVisibleColumns,
    toggleColumn,
    showAll,
    hideAll,
    reorderColumns,
    togglePin,
    resetAll: resetColumnSettings,
  } = useColumnSettings(columns);

  // Keyboard shortcuts
  const toggleHelp = useCallback(() => setHelpOpen((p) => !p), []);
  const toggleColSettings = useCallback(() => setColumnSettingsOpen((p) => !p), []);
  useKeyboardShortcuts({
    onToggleHelp: toggleHelp,
    onToggleColumnSettings: toggleColSettings,
  });

  // Initialize from URL params
  useEffect(() => {
    const filesParam = searchParams.get('files');
    if (filesParam) {
      const fileIds = filesParam.split(',').filter(Boolean);
      setSelectedFiles(fileIds);
    }

    const encodedFilters = searchParams.get('f');
    if (encodedFilters) {
      try {
        const decodedFilters = decodeFilters(encodedFilters);
        setFilters(decodedFilters);
        toast({ title: "Filters applied", description: "Loaded filters from AI query" });
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('f');
        setSearchParams(newParams, { replace: true });
      } catch (error) {
        console.error("Failed to decode filters:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('files', selectedFiles.join(','));
        return newParams;
      });
    } else {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('files');
        return newParams;
      });
    }
  }, [selectedFiles, setSearchParams]);

  const apply = () => setFilters({ ...filters });
  const clear = () => setFilters({});

  useEffect(() => {
    if (sessionStorage.getItem("ucpv.cleared") === "1") {
      sessionStorage.removeItem("ucpv.cleared");
      setFilters({});
      refetchCols();
      setRefreshKey((k) => k + 1);
    }
  }, [refetchCols]);

  useEffect(() => {
    if (colsData?.datasetVersion) {
      if (datasetVersion && datasetVersion !== colsData.datasetVersion) {
        setFilters({});
        setRefreshKey((k) => k + 1);
        toast({ title: "Dataset Updated", description: "Schema changed - filters have been cleared" });
      }
      setDatasetVersion(colsData.datasetVersion);
    }
  }, [colsData?.datasetVersion, datasetVersion]);

  const handleRowClick = useCallback((row: Record<string, any>, index: number) => {
    setSelectedRowIndex(index);
    // We need to track the row data - store it via a ref-like pattern
    setAllRows((prev) => {
      // Ensure the row exists at this index
      const updated = [...prev];
      updated[index] = row;
      return updated;
    });
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, duration: 0.3 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <motion.main
        className="container mx-auto py-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.aside className="lg:col-span-4 space-y-6" variants={itemVariants}>
            <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
              <UploadPanel onComplete={() => refetchCols()} />
            </motion.div>
            <motion.div className="glass-card liquid-scale rounded-md p-4" whileHover={{ scale: 1.005 }} transition={{ duration: 0.2 }}>
              <div className="space-y-4">
                <FileMultiSelect selectedFiles={selectedFiles} onSelectionChange={setSelectedFiles} />
                <Separator />
                <FiltersPanel
                  columns={columns}
                  filters={filters}
                  selectedFiles={selectedFiles}
                  setFilters={setFilters}
                  onApply={apply}
                  onClearAll={clear}
                  refreshKey={refreshKey}
                />
              </div>
            </motion.div>
          </motion.aside>

          <motion.section className="lg:col-span-8 space-y-4" variants={itemVariants}>
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gradient-primary">
                CSV Viewer Data
              </h1>
              <div className="flex items-center gap-3">
                <ColumnSettings
                  columnOrder={columnOrder}
                  visibleColumns={visibleColumns}
                  pinnedColumns={pinnedColumns}
                  onToggleColumn={toggleColumn}
                  onReorder={reorderColumns}
                  onTogglePin={togglePin}
                  onShowAll={showAll}
                  onHideAll={hideAll}
                  onReset={resetColumnSettings}
                  open={columnSettingsOpen}
                  onOpenChange={setColumnSettingsOpen}
                />
                <motion.div whileHover={{ scale: 1.05, rotate: 1 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                  <Button variant="destructive" asChild className="button-smooth hover-glow liquid-bounce">
                    <Link to="/settings">🗑️ Delete All Data</Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                  <BulkDeleteDialog
                    filters={filters}
                    onDeleted={() => {
                      setFilters({});
                      refetchCols();
                      setRefreshKey((k) => k + 1);
                    }}
                  />
                </motion.div>
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.2 }}>
                  <DownloadCsv filters={filters} fields={columns} />
                </motion.div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.3, delay: 0.3 }}>
              <Separator />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
              <DataTable
                columnsList={orderedVisibleColumns}
                filters={filters}
                selectedFiles={selectedFiles}
                refreshKey={refreshKey}
                pinnedColumns={pinnedColumns}
                onRowClick={handleRowClick}
              />
            </motion.div>
          </motion.section>
        </div>
      </motion.main>

      <RowDetailModal
        row={selectedRowIndex !== null ? allRows[selectedRowIndex] ?? null : null}
        columns={orderedVisibleColumns}
        currentIndex={selectedRowIndex ?? 0}
        totalRows={allRows.length}
        onClose={() => setSelectedRowIndex(null)}
        onPrev={() => setSelectedRowIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onNext={() => setSelectedRowIndex((i) => (i !== null && i < allRows.length - 1 ? i + 1 : i))}
      />

      <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
};

export default Index;
