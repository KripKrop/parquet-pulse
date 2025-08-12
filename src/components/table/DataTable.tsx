import { useEffect, useMemo, useRef } from "react";
import { ColumnDef, getCoreRowModel, useReactTable, flexRender } from "@tanstack/react-table";
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
    estimateSize: () => 40,
    getItemKey: (index) => table.getRowModel().rows[index]?.id ?? `loader-${index}`,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = rowVirtualizer.getTotalSize() - (virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].end : 0);

  useEffect(() => {
    // Reset scroll and virtualizer when filters change to avoid blank/placeholder rows
    parentRef.current?.scrollTo({ top: 0 });
    rowVirtualizer.scrollToIndex(0);
  }, [filters, columnsList]);

  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (last.index >= rows.length - 1 && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [virtualItems, rows.length, hasNextPage, isFetching, fetchNextPage]);


  return (
    <div className="border rounded-md overflow-hidden">
      <div ref={parentRef} className="max-h-[70vh] overflow-auto">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div
            className="grid w-full min-w-full"
            style={{ gridTemplateColumns: `repeat(${columnsList.length}, minmax(160px, 1fr))` }}
          >
            {table.getHeaderGroups().map((hg) => (
              <div key={hg.id} className="contents">
                {hg.headers.map((h) => (
                  <div
                    key={h.id}
                    className="px-3 py-2 h-10 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                    title={String(h.column.columnDef.header as any)}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div
          className="grid w-full min-w-full transform-gpu"
          style={{ gridTemplateColumns: `repeat(${columnsList.length}, minmax(160px, 1fr))` }}
        >
          {paddingTop > 0 && <div style={{ height: paddingTop }} className="col-span-full" />}

          {virtualItems.map((vi) => {
            const isLoader = hasNextPage && vi.index === rows.length;
            if (isLoader) {
              return (
                <div key={`loader-${vi.index}`} className="col-span-full px-3 py-2 h-10 text-sm text-muted-foreground border-b">
                  Loading...
                </div>
              );
            }
            if (vi.index >= rows.length) return null;

            const row = table.getRowModel().rows[vi.index];
            return (
              <div key={row.id} className="contents">
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="px-3 py-2 h-10 text-sm border-b whitespace-nowrap overflow-hidden text-ellipsis"
                    title={String((row as any).original[cell.column.id] ?? "")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}

          {paddingBottom > 0 && <div style={{ height: paddingBottom }} className="col-span-full" />}
        </div>
      </div>
      {rows.length === 0 && (
        <div className="px-4 py-10 text-center text-muted-foreground">No rows match your filters.</div>
      )}
    </div>
  );
};
