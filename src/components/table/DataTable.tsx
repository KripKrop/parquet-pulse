import { useEffect, useMemo, useRef } from "react";
import { ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { request } from "@/services/apiClient";
import type { QueryBody, QueryResponse } from "@/types/api";

export const DataTable: React.FC<{
  columnsList: string[];
  filters: Record<string, string[]>;
}> = ({ columnsList, filters }) => {
  const limit = 200;

  const queryFn = async ({ pageParam = 0 }): Promise<QueryResponse> => {
    const body: QueryBody = { filters, limit, offset: pageParam };
    return request<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  const { data, fetchNextPage, hasNextPage, isFetching, refetch } = useInfiniteQuery({
    queryKey: ["query", filters],
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.rows.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  // rebuild columns for table
  const columns = useMemo<ColumnDef<Record<string, any>>[]>(() => {
    return columnsList.map((key) => ({
      id: key,
      header: key,
      cell: ({ row }) => String(row.original[key] ?? ""),
    }));
  }, [columnsList]);

  const rows = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  useEffect(() => {
    const [last] = [...rowVirtualizer.getVirtualItems()].slice(-1);
    if (!last) return;
    if (last.index >= rows.length - 1 && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [rowVirtualizer.getVirtualItems(), rows.length, hasNextPage, isFetching, fetchNextPage]);

  useEffect(() => {
    refetch();
  }, [filters, refetch]);

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${columnsList.length}, minmax(120px, 1fr))` }}>
          {table.getHeaderGroups().map((hg) => (
            <div key={hg.id} className="contents">
              {hg.headers.map((h) => (
                <div key={h.id} className="px-3 py-2 text-sm font-medium">
                  {h.isPlaceholder ? null : h.column.columnDef.header as any}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div ref={parentRef} className="max-h-[70vh] overflow-auto">
        <div
          className="relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          <div
            className="absolute top-0 left-0 w-full grid"
            style={{ transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`, gridTemplateColumns: `repeat(${columnsList.length}, minmax(120px, 1fr))` }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const row = table.getRowModel().rows[vi.index];
              if (!row) {
                return (
                  <div key={`loader-${vi.index}`} className="col-span-full px-3 py-2 text-sm text-muted-foreground">
                    Loading...
                  </div>
                );
              }
              return (
                <div key={row.id} className="contents">
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="px-3 py-2 text-sm border-b">
                      {cell.getValue() as any}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {rows.length === 0 && (
        <div className="px-4 py-10 text-center text-muted-foreground">No rows match your filters.</div>
      )}
    </div>
  );
};
