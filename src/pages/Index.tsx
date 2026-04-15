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
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Upload, SlidersHorizontal, Files, Columns3 } from "lucide-react";

type MobilePanel = "upload" | "filters" | "columns" | null;

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  
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
    setSelectedRow({ row, index });
  }, []);

  const handleRowsChange = useCallback((rows: Record<string, any>[]) => {
    setRowsSnapshot(rows);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, duration: 0.3 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const activeFilterCount = Object.keys(filters).length;

  return (
    <>
      <motion.main
        className={`container mx-auto py-6 ${isMobile ? "pb-20" : ""}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {isMobile ? (
          /* ─── Mobile: full-width data table, no sidebar ─── */
          <motion.div className="space-y-4" variants={itemVariants}>
            <motion.div
              className="flex items-center justify-between px-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h1 className="text-xl font-semibold tracking-tight text-gradient-primary">
                CSV Data
              </h1>
              <div className="flex items-center gap-2">
                <DownloadCsv filters={filters} fields={columns} />
                <BulkDeleteDialog
                  filters={filters}
                  onDeleted={() => {
                    setFilters({});
                    refetchCols();
                    setRefreshKey((k) => k + 1);
                  }}
                />
              </div>
            </motion.div>
            <Separator />
            <DataTable
              columnsList={orderedVisibleColumns}
              filters={filters}
              selectedFiles={selectedFiles}
              refreshKey={refreshKey}
              pinnedColumns={pinnedColumns}
              onRowClick={handleRowClick}
              onRowsChange={handleRowsChange}
            />
          </motion.div>
        ) : (
          /* ─── Desktop: original grid layout ─── */
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
                  onRowsChange={handleRowsChange}
                />
              </motion.div>
            </motion.section>
          </div>
        )}
      </motion.main>

      {/* ─── Mobile sticky bottom bar ─── */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t safe-area-bottom">
          <div className="flex items-center justify-around py-2 px-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-3 text-xs"
              onClick={() => setMobilePanel("upload")}
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-0.5 h-auto py-1.5 px-3 text-xs relative ${
                activeFilterCount > 0 ? "text-primary" : ""
              }`}
              onClick={() => setMobilePanel("filters")}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-3 text-xs"
              onClick={() => setMobilePanel("columns")}
            >
              <Columns3 className="h-4 w-4" />
              Columns
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 h-auto py-1.5 px-3 text-xs"
              asChild
            >
              <Link to="/files">
                <Files className="h-4 w-4" />
                Files
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* ─── Mobile drawers ─── */}
      <Drawer open={mobilePanel === "upload"} onOpenChange={(v) => !v && setMobilePanel(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Upload Files</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            <UploadPanel onComplete={() => { refetchCols(); setMobilePanel(null); }} />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={mobilePanel === "filters"} onOpenChange={(v) => !v && setMobilePanel(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Filters & Files</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto space-y-4">
            <FileMultiSelect selectedFiles={selectedFiles} onSelectionChange={setSelectedFiles} />
            <Separator />
            <FiltersPanel
              columns={columns}
              filters={filters}
              selectedFiles={selectedFiles}
              setFilters={setFilters}
              onApply={() => { apply(); setMobilePanel(null); }}
              onClearAll={clear}
              refreshKey={refreshKey}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={mobilePanel === "columns"} onOpenChange={(v) => !v && setMobilePanel(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Column Settings</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
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
              open={true}
              onOpenChange={() => setMobilePanel(null)}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <RowDetailModal
        row={selectedRow ? selectedRow.row : null}
        columns={orderedVisibleColumns}
        currentIndex={selectedRow?.index ?? 0}
        totalRows={rowsSnapshot.length}
        onClose={() => setSelectedRow(null)}
        onPrev={() => setSelectedRow((prev) => {
          if (!prev || prev.index <= 0) return prev;
          const newIndex = prev.index - 1;
          return { row: rowsSnapshot[newIndex], index: newIndex };
        })}
        onNext={() => setSelectedRow((prev) => {
          if (!prev || prev.index >= rowsSnapshot.length - 1) return prev;
          const newIndex = prev.index + 1;
          return { row: rowsSnapshot[newIndex], index: newIndex };
        })}
      />

      <KeyboardShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
};

export default Index;
