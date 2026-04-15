import { useState, useCallback, useMemo, useEffect } from "react";

const STORAGE_KEY = "crunch_column_settings";

interface ColumnSettingsState {
  visibleColumns: string[];
  columnOrder: string[];
  pinnedColumns: string[];
}

function hashColumns(cols: string[]): string {
  return cols.slice().sort().join("|");
}

function loadSettings(hash: string): ColumnSettingsState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw);
    return all[hash] ?? null;
  } catch {
    return null;
  }
}

function saveSettings(hash: string, state: ColumnSettingsState) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[hash] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {}
}

export function useColumnSettings(columnsList: string[]) {
  const hash = useMemo(() => hashColumns(columnsList), [columnsList]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columnsList);
  const [columnOrder, setColumnOrder] = useState<string[]>(columnsList);
  const [pinnedColumns, setPinnedColumns] = useState<string[]>([]);

  // Hydrate from localStorage on mount or when columns change
  useEffect(() => {
    if (columnsList.length === 0) return;
    const saved = loadSettings(hash);
    if (saved) {
      // Prune removed columns, append new ones
      const existing = new Set(columnsList);
      const order = saved.columnOrder.filter((c) => existing.has(c));
      const newCols = columnsList.filter((c) => !order.includes(c));
      const finalOrder = [...order, ...newCols];

      setColumnOrder(finalOrder);
      setVisibleColumns(saved.visibleColumns.filter((c) => existing.has(c)));
      setPinnedColumns(saved.pinnedColumns.filter((c) => existing.has(c)));
    } else {
      setColumnOrder(columnsList);
      setVisibleColumns(columnsList);
      setPinnedColumns([]);
    }
  }, [hash, columnsList]);

  // Persist on change
  useEffect(() => {
    if (columnsList.length === 0) return;
    saveSettings(hash, { visibleColumns, columnOrder, pinnedColumns });
  }, [visibleColumns, columnOrder, pinnedColumns, hash, columnsList]);

  const toggleColumn = useCallback((col: string) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }, []);

  const showAll = useCallback(() => setVisibleColumns(columnOrder), [columnOrder]);
  const hideAll = useCallback(() => setVisibleColumns([]), []);

  const reorderColumns = useCallback((newOrder: string[]) => {
    setColumnOrder(newOrder);
  }, []);

  const togglePin = useCallback((col: string) => {
    setPinnedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }, []);

  const resetAll = useCallback(() => {
    setVisibleColumns(columnsList);
    setColumnOrder(columnsList);
    setPinnedColumns([]);
  }, [columnsList]);

  // Computed: ordered columns, filtered by visibility, pinned first
  const orderedVisibleColumns = useMemo(() => {
    const visible = new Set(visibleColumns);
    const pinned = new Set(pinnedColumns);
    const ordered = columnOrder.filter((c) => visible.has(c));
    const pinnedOrdered = ordered.filter((c) => pinned.has(c));
    const unpinnedOrdered = ordered.filter((c) => !pinned.has(c));
    return [...pinnedOrdered, ...unpinnedOrdered];
  }, [visibleColumns, columnOrder, pinnedColumns]);

  return {
    visibleColumns,
    columnOrder,
    pinnedColumns,
    orderedVisibleColumns,
    toggleColumn,
    showAll,
    hideAll,
    reorderColumns,
    togglePin,
    resetAll,
  };
}
