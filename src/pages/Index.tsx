import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/apiClient";
import type { ColumnsResponse } from "@/types/api";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { FiltersPanel, type Filters } from "@/components/filters/FiltersPanel";
import { DataTable } from "@/components/table/DataTable";
import { DownloadCsv } from "@/components/download/DownloadCsv";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BulkDeleteDialog } from "@/components/delete/BulkDeleteDialog";

const Index = () => {
  const { data: colsData, refetch: refetchCols } = useQuery({
    queryKey: ["columns"],
    queryFn: () => request<ColumnsResponse>("/columns"),
  });

  const [filters, setFilters] = useState<Filters>({});
  const [refreshKey, setRefreshKey] = useState(0);
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

  return (
    <main className="container mx-auto py-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-6 animate-fade-in">
          <UploadPanel onComplete={() => refetchCols()} />
          <div className="border rounded-md p-4 card-elevated">
            <FiltersPanel
              columns={columns}
              filters={filters}
              setFilters={setFilters}
              onApply={apply}
              onClearAll={clear}
            />
          </div>
        </aside>
        <section className="lg:col-span-8 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gradient">CSV Viewer Data</h1>
            <div className="flex items-center gap-2">
              <BulkDeleteDialog
                filters={filters}
                onDeleted={() => {
                  refetchCols();
                  setRefreshKey((k) => k + 1);
                }}
              />
              <DownloadCsv filters={filters} fields={columns} />
              <Button variant="gradient" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</Button>
            </div>
          </div>
          <Separator />
          <DataTable columnsList={columns} filters={filters} refreshKey={refreshKey} />
        </section>
      </div>
    </main>
  );
};

export default Index;
