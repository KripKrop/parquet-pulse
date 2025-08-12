import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/apiClient";
import type { ColumnsResponse } from "@/types/api";
import { UploadPanel } from "@/components/upload/UploadPanel";
import { FiltersPanel, type Filters } from "@/components/filters/FiltersPanel";
import { DataTable } from "@/components/table/DataTable";
import { DownloadCsv } from "@/components/download/DownloadCsv";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const Index = () => {
  const { data: colsData, refetch: refetchCols } = useQuery({
    queryKey: ["columns"],
    queryFn: () => request<ColumnsResponse>("/columns"),
  });

  const [filters, setFilters] = useState<Filters>({});
  const apply = () => setFilters({ ...filters });
  const clear = () => setFilters({});

  const columns = colsData?.columns ?? [];

  return (
    <main className="container mx-auto py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-6">
          <UploadPanel onComplete={() => refetchCols()} />
          <div className="border rounded-md p-4">
            <FiltersPanel
              columns={columns}
              filters={filters}
              setFilters={setFilters}
              onApply={apply}
              onClearAll={clear}
            />
          </div>
        </aside>
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Data</h1>
            <div className="flex items-center gap-2">
              <DownloadCsv filters={filters} fields={columns} />
              <Button variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</Button>
            </div>
          </div>
          <Separator />
          <DataTable columnsList={columns} filters={filters} />
        </section>
      </div>
    </main>
  );
};

export default Index;
