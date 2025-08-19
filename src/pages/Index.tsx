import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { request } from "@/services/apiClient";
import type { ColumnsResponse } from "@/types/api";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { FiltersPanel, type Filters } from "@/components/filters/FiltersPanel";
import { DataTable } from "@/components/table/DataTable";
import { DownloadCsv } from "@/components/download/DownloadCsv";
import { FileMultiSelect } from "@/components/files/FileMultiSelect";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BulkDeleteDialog } from "@/components/delete/BulkDeleteDialog";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { data: colsData, refetch: refetchCols } = useQuery({
    queryKey: ["columns"],
    queryFn: () => request<ColumnsResponse>("/columns"),
  });

  const [filters, setFilters] = useState<Filters>({});
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Initialize from URL params
  useEffect(() => {
    const filesParam = searchParams.get('files');
    if (filesParam) {
      const fileIds = filesParam.split(',').filter(Boolean);
      setSelectedFiles(fileIds);
    }
  }, [searchParams]);

  // Update URL when files change
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
    // If a global clear occurred from Settings, reset and refresh
    if (sessionStorage.getItem("ucpv.cleared") === "1") {
      sessionStorage.removeItem("ucpv.cleared");
      setFilters({});
      refetchCols();
      setRefreshKey((k) => k + 1);
    }
  }, [refetchCols]);

  const columns = colsData?.columns ?? [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0
    }
  };

  return (
    <motion.main 
      className="container mx-auto py-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <motion.aside 
          className="lg:col-span-4 space-y-6"
          variants={itemVariants}
        >
          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <UploadPanel onComplete={() => refetchCols()} />
          </motion.div>
          <motion.div 
            className="glass-card liquid-scale rounded-md p-4"
            whileHover={{ scale: 1.005 }}
            transition={{ duration: 0.2 }}
          >
            <div className="space-y-4">
              <FileMultiSelect 
                selectedFiles={selectedFiles}
                onSelectionChange={setSelectedFiles}
              />
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
        
        <motion.section 
          className="lg:col-span-8 space-y-4"
          variants={itemVariants}
        >
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
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 1 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Button variant="destructive" asChild className="button-smooth hover-glow liquid-bounce">
                  <Link to="/settings">🗑️ Delete All Data</Link>
                </Button>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <BulkDeleteDialog
                  filters={filters}
                  onDeleted={() => {
                    setFilters({});
                    refetchCols();
                    setRefreshKey((k) => k + 1);
                  }}
                />
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.05, y: -2 }} 
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <DownloadCsv filters={filters} fields={columns} />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Separator />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <DataTable 
              columnsList={columns} 
              filters={filters} 
              selectedFiles={selectedFiles}
              refreshKey={refreshKey} 
            />
          </motion.div>
        </motion.section>
      </div>
    </motion.main>
  );
};

export default Index;
