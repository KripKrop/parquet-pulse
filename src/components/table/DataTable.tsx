import { useEffect, useMemo, useRef } from "react";
import { ColumnDef, getCoreRowModel, useReactTable, flexRender } from "@tanstack/react-table";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { request } from "@/services/apiClient";
import type { QueryBody, QueryResponse } from "@/types/api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { motion, AnimatePresence } from "framer-motion";
import { TableRowSkeleton } from "./TableRowSkeleton";
import { useSmartPrefetch } from "@/hooks/useSmartPrefetch";

export const DataTable: React.FC<{
  columnsList: string[];
  filters: Record<string, string[]>;
  selectedFiles?: string[];
  refreshKey?: number;
  pinnedColumns?: string[];
  onRowClick?: (row: Record<string, any>, index: number) => void;
  onRowsChange?: (rows: Record<string, any>[]) => void;
}> = ({ columnsList, filters, selectedFiles = [], refreshKey = 0, pinnedColumns = [], onRowClick, onRowsChange }) => {
  const limit = 200;
  const pinnedSet = useMemo(() => new Set(pinnedColumns), [pinnedColumns]);

  const queryFn = async ({ pageParam = 0 }): Promise<QueryResponse> => {
    const body: QueryBody = { filters, limit, offset: pageParam, source_files: selectedFiles };
    return request<QueryResponse>("/query", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  const { data, fetchNextPage, hasNextPage, isFetching, refetch, isLoading } = useInfiniteQuery({
    queryKey: ["query", filters, selectedFiles, refreshKey],
    queryFn,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, p) => acc + p.rows.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  const columns = useMemo<ColumnDef<Record<string, any>>[]>(() => {
    return columnsList.map((key) => ({
      id: key,
      header: key,
      cell: ({ row }) => String(row.original[key] ?? ""),
    }));
  }, [columnsList]);

  const rows = useMemo(() => data?.pages.flatMap((p) => p.rows) ?? [], [data]);

  // Notify parent of row changes for row detail navigation
  useEffect(() => {
    onRowsChange?.(rows);
  }, [rows, onRowsChange]);
  const total = data?.pages?.[0]?.total ?? 0;

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);

  const { handleScroll } = useSmartPrefetch({
    fetchNextPage,
    hasNextPage,
    isFetching,
    threshold: 0.7,
    prefetchThreshold: 40,
  });

  const rowVirtualizer = useVirtualizer({
    count: rows.length + (hasNextPage ? 1 : 0) + (isLoading ? 8 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    getItemKey: (index) => {
      if (isLoading && index < 8) return `skeleton-${index}`;
      const adjustedIndex = isLoading ? index - 8 : index;
      return table.getRowModel().rows[adjustedIndex]?.id ?? `loader-${adjustedIndex}`;
    },
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = rowVirtualizer.getTotalSize() - (virtualItems.length > 0 ? virtualItems[virtualItems.length - 1].end : 0);

  // Compute pinned column widths for sticky positioning
  const pinnedWidths = useMemo(() => {
    const COL_WIDTH = 220;
    const widths: Record<string, number> = {};
    let left = 0;
    for (const col of columnsList) {
      if (pinnedSet.has(col)) {
        widths[col] = left;
        left += COL_WIDTH;
      }
    }
    return widths;
  }, [columnsList, pinnedSet]);

  const gridTemplate = useMemo(() => {
    return `repeat(${columnsList.length}, 220px)`;
  }, [columnsList.length]);

  useEffect(() => {
    parentRef.current?.scrollTo({ top: 0 });
    rowVirtualizer.scrollToIndex(0);
  }, [filters, columnsList]);

  useEffect(() => {
    const parentElement = parentRef.current;
    if (!parentElement) return;
    const onScroll = () => handleScroll(parentElement, rows.length, virtualItems);
    parentElement.addEventListener("scroll", onScroll, { passive: true });
    return () => parentElement.removeEventListener("scroll", onScroll);
  }, [handleScroll, rows.length, virtualItems]);

  useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    const adjustedIndex = isLoading ? last.index - 8 : last.index;
    if (adjustedIndex >= rows.length - 1 && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [virtualItems, rows.length, hasNextPage, isFetching, fetchNextPage, isLoading]);

  const renderCell = (colId: string, content: React.ReactNode, title: string, key: string, cellIndex: number) => {
    const isPinned = pinnedSet.has(colId);
    return (
      <motion.div
        key={key}
        className={`px-4 py-3 h-12 text-sm border-b whitespace-nowrap overflow-hidden text-ellipsis transition-all duration-200 hover:bg-accent/30 hover:backdrop-blur-sm liquid-bounce hover:shadow-sm group cursor-pointer ${
          isPinned ? "bg-background/95 backdrop-blur-sm" : ""
        }`}
        style={
          isPinned
            ? { position: "sticky", left: pinnedWidths[colId], zIndex: 5, boxShadow: pinnedWidths[colId] !== undefined && !pinnedSet.has(columnsList[columnsList.indexOf(colId) + 1]) ? "2px 0 8px -2px hsl(var(--border) / 0.5)" : undefined }
            : undefined
        }
        title={title}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: cellIndex * 0.01, ease: "easeOut" }}
        whileHover={{
          scale: 1.005,
          backgroundColor: "hsl(var(--accent) / 0.4)",
          boxShadow: "0 2px 8px -2px hsl(var(--primary) / 0.1)",
        }}
      >
        <motion.span
          className="group-hover:text-foreground transition-colors duration-150"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {content}
        </motion.span>
      </motion.div>
    );
  };

  return (
    <motion.div
      className="glass-table liquid-scale overflow-hidden rounded-xl border-0 shadow-2xl"
      initial={{ opacity: 0, scale: 0.98, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div ref={parentRef} className="max-h-[70vh] overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
        <div className="sticky top-0 z-10 glass-panel border-b backdrop-blur-xl bg-background/80">
          <div className="grid min-w-full w-max" style={{ gridTemplateColumns: gridTemplate }}>
            {table.getHeaderGroups().map((hg, groupIndex) => (
              <motion.div
                key={hg.id}
                className="contents"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: groupIndex * 0.05 }}
              >
                {hg.headers.map((h, headerIndex) => {
                  const isPinned = pinnedSet.has(h.id);
                  return (
                    <motion.div
                      key={h.id}
                      className={`px-4 py-3 h-12 text-sm font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-gradient-primary hover:bg-accent/20 transition-all duration-200 ${
                        isPinned ? "bg-background/95 backdrop-blur-sm" : ""
                      }`}
                      style={
                        isPinned
                          ? { position: "sticky", left: pinnedWidths[h.id], zIndex: 15 }
                          : undefined
                      }
                      title={String(h.column.columnDef.header as any)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: headerIndex * 0.02 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </motion.div>
                  );
                })}
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
            <motion.strong key={`showing-${rows.length}`} initial={{ scale: 1.2, color: "hsl(var(--primary))" }} animate={{ scale: 1, color: "hsl(var(--foreground))" }} transition={{ duration: 0.3 }}>
              <AnimatedCounter value={rows.length} />
            </motion.strong>{" "}
            of{" "}
            <motion.strong key={`total-${total}`} initial={{ scale: 1.2, color: "hsl(var(--primary))" }} animate={{ scale: 1, color: "hsl(var(--foreground))" }} transition={{ duration: 0.3 }}>
              <AnimatedCounter value={total} />
            </motion.strong>{" "}
            rows
          </span>
          {isFetching && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span>Loading...</span>
            </motion.div>
          )}
        </motion.div>

        <div className="grid min-w-full w-max transform-gpu" style={{ gridTemplateColumns: gridTemplate }}>
          {paddingTop > 0 && <div style={{ height: paddingTop }} className="col-span-full" />}

          {virtualItems.map((vi) => {
            if (isLoading && vi.index < 8) {
              return <TableRowSkeleton key={`skeleton-${vi.index}`} columnCount={columnsList.length} index={vi.index} />;
            }

            const adjustedIndex = isLoading ? vi.index - 8 : vi.index;
            const isLoader = hasNextPage && adjustedIndex === rows.length;

            if (isLoader) {
              return (
                <motion.div key={`loader-${vi.index}`} className="col-span-full px-3 py-2 h-10 text-sm text-muted-foreground border-b flex items-center gap-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <LoadingSpinner size="sm" />
                  </motion.div>
                  <motion.span initial={{ opacity: 0.6 }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                    Streaming more data...
                  </motion.span>
                </motion.div>
              );
            }

            if (adjustedIndex >= rows.length) return null;

            const row = table.getRowModel().rows[adjustedIndex];
            if (!row) return null;

            return (
              <motion.div
                key={row.id}
                className="contents"
                onClick={() => onRowClick?.(row.original, adjustedIndex)}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: Math.min(adjustedIndex * 0.02, 0.4), ease: "easeOut" }}
              >
                {row.getVisibleCells().map((cell, cellIndex) =>
                  renderCell(
                    cell.column.id,
                    flexRender(cell.column.columnDef.cell, cell.getContext()),
                    String((row as any).original[cell.column.id] ?? ""),
                    cell.id,
                    cellIndex
                  )
                )}
              </motion.div>
            );
          })}

          {paddingBottom > 0 && <div style={{ height: paddingBottom }} className="col-span-full" />}
        </div>
      </div>
      {rows.length === 0 && !isFetching && (
        <motion.div className="px-4 py-10 text-center text-muted-foreground space-y-3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
          <motion.div initial={{ y: 10 }} animate={{ y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <img src="/images/ui/loading-data.gif" alt="No results animation" className="mx-auto h-20 w-20 opacity-80" loading="lazy" />
            <div className="text-lg font-medium mb-2">📊 No data found</div>
            <div className="text-sm">Try adjusting your filters or upload more data.</div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};
