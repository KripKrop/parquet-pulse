import { useEffect, useMemo, useRef } from "react";
import { ColumnDef, getCoreRowModel, useReactTable, flexRender } from "@tanstack/react-table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { request } from "@/services/apiClient";
import type { QueryBody, QueryResponse } from "@/types/api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { motion, AnimatePresence } from "framer-motion";

export const DataTable: React.FC<{
  columnsList: string[];
  filters: Record<string, string[]>;
  refreshKey?: number;
}> = ({ columnsList, filters, refreshKey = 0 }) => {
  const limit = 200;

  const queryFn = async ({ pageParam = 0 }): Promise<QueryResponse> => {
    const body: QueryBody = { filters, limit, offset: pageParam };
    return request<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  const { data, fetchNextPage, hasNextPage, isFetching, refetch } = useInfiniteQuery({
    queryKey: ["query", filters, refreshKey],
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
  const total = data?.pages?.[0]?.total ?? 0;

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
    <motion.div 
      className="glass-table liquid-scale overflow-hidden rounded-xl border-0 shadow-2xl"
      initial={{ opacity: 0, scale: 0.98, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div ref={parentRef} className="max-h-[70vh] overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        <div className="sticky top-0 z-10 glass-panel border-b backdrop-blur-xl bg-background/80">
          <div
            className="grid min-w-full w-max"
            style={{ gridTemplateColumns: `repeat(${columnsList.length}, 220px)` }}
          >
            {table.getHeaderGroups().map((hg, groupIndex) => (
              <motion.div 
                key={hg.id} 
                className="contents"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: groupIndex * 0.05 }}
              >
                {hg.headers.map((h, headerIndex) => (
                  <motion.div
                    key={h.id}
                    className="px-4 py-3 h-12 text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-gradient-primary hover:bg-accent/20 transition-all duration-200"
                    title={String(h.column.columnDef.header as any)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: headerIndex * 0.02 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div 
          className="px-3 py-2 text-xs text-muted-foreground border-b flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="flex items-center gap-2">
            Showing{" "}
            <motion.strong
              key={`showing-${rows.length}`}
              initial={{ scale: 1.2, color: "hsl(var(--primary))" }}
              animate={{ scale: 1, color: "hsl(var(--foreground))" }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedCounter value={rows.length} />
            </motion.strong>{" "}
            of{" "}
            <motion.strong
              key={`total-${total}`}
              initial={{ scale: 1.2, color: "hsl(var(--primary))" }}
              animate={{ scale: 1, color: "hsl(var(--foreground))" }}
              transition={{ duration: 0.3 }}
            >
              <AnimatedCounter value={total} />
            </motion.strong>{" "}
            rows
          </span>
          {isFetching && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2"
            >
              <LoadingSpinner size="sm" />
              <span>Loading...</span>
            </motion.div>
          )}
        </motion.div>

        <div
          className="grid min-w-full w-max transform-gpu"
          style={{ gridTemplateColumns: `repeat(${columnsList.length}, 220px)` }}
        >
          {paddingTop > 0 && <div style={{ height: paddingTop }} className="col-span-full" />}

          {virtualItems.map((vi) => {
            const isLoader = hasNextPage && vi.index === rows.length;
            if (isLoader) {
              return (
                <motion.div 
                  key={`loader-${vi.index}`} 
                  className="col-span-full px-3 py-2 h-10 text-sm text-muted-foreground border-b flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <LoadingSpinner size="sm" />
                  Loading more data...
                </motion.div>
              );
            }
            if (vi.index >= rows.length) return null;

            const row = table.getRowModel().rows[vi.index];
            return (
              <motion.div 
                key={row.id} 
                className="contents"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: Math.min(vi.index * 0.01, 0.3) }}
              >
                {row.getVisibleCells().map((cell, cellIndex) => (
                  <motion.div
                    key={cell.id}
                    className="px-4 py-3 h-12 text-sm border-b whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200 hover:bg-accent/30 hover:backdrop-blur-sm liquid-bounce hover:shadow-sm group cursor-default"
                    title={String((row as any).original[cell.column.id] ?? "")}
                    whileHover={{ 
                      scale: 1.005,
                      backgroundColor: "hsl(var(--accent) / 0.4)",
                      boxShadow: "0 2px 8px -2px hsl(var(--primary) / 0.1)"
                    }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="group-hover:text-foreground transition-colors duration-150">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            );
          })}

          {paddingBottom > 0 && <div style={{ height: paddingBottom }} className="col-span-full" />}
        </div>
      </div>
      {rows.length === 0 && !isFetching && (
        <motion.div 
          className="px-4 py-10 text-center text-muted-foreground space-y-3"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ y: 10 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <img
              src="/images/ui/loading-data.gif"
              alt="No results animation"
              className="mx-auto h-20 w-20 opacity-80"
              loading="lazy"
            />
            <div className="text-lg font-medium mb-2">📊 No data found</div>
            <div className="text-sm">Try adjusting your filters or upload more data.</div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};
