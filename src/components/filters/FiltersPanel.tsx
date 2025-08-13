import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/hooks/useDebounce";
import { request } from "@/services/apiClient";

export type Filters = Record<string, string[]>;

export const FiltersPanel: React.FC<{
  columns: string[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  onApply?: () => void;
  onClearAll?: () => void;
  refreshKey?: number;
}> = ({ columns, filters, setFilters, onApply, onClearAll, refreshKey = 0 }) => {
  const [open, setOpen] = useState<string[]>([]);
  const [search, setSearch] = useState<Record<string, string>>({});
  const debounced = useDebounce(search, 300);
  const [options, setOptions] = useState<Record<string, string[]>>({});

  const fetchDistinct = async (col: string, q?: string) => {
    const url = q ? `/distinct/${encodeURIComponent(col)}?q=${encodeURIComponent(q)}&limit=200` : `/distinct/${encodeURIComponent(col)}?limit=200`;
    const res = await request<{ values: string[] }>(url);
    setOptions((prev) => ({ ...prev, [col]: res.values }));
  };

  // when a panel opens, search changes, or refreshKey bumps, fetch
  useEffect(() => {
    open.forEach((col) => fetchDistinct(col, debounced[col]));
  }, [open, debounced, refreshKey]);

  const toggleValue = (col: string, val: string) => {
    const cur = new Set(filters[col] || []);
    if (cur.has(val)) cur.delete(val); else cur.add(val);
    const next: Filters = { ...filters, [col]: Array.from(cur) };
    if ((next[col]?.length || 0) === 0) delete next[col];
    setFilters(next);
  };

  const setColumnValues = (col: string, vals: string[]) => {
    const next: Filters = { ...filters };
    if (vals.length > 0) next[col] = vals; else delete next[col];
    setFilters(next);
  };

  const clearAll = () => {
    setFilters({});
    onClearAll?.();
  };

  const totalSelected = Object.values(filters).reduce((a, b) => a + b.length, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Filters {totalSelected > 0 ? `(${totalSelected})` : ""}</div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={clearAll}>Clear All</Button>
          <Button size="sm" onClick={onApply}>Apply</Button>
        </div>
      </div>
      <Separator />
      <Accordion type="multiple" value={open} onValueChange={(v) => setOpen(v as string[])} className="w-full">
        {columns.map((col) => (
          <AccordionItem value={col} key={col}>
            <AccordionTrigger className="text-left">
              <div className="flex items-center justify-between w-full">
                <span>{col}</span>
                <span className="text-xs text-muted-foreground">
                  {(filters[col]?.length || 0)}{options[col] ? `/${(options[col] || []).length}` : ""}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <Input
                  placeholder={`Search ${col}...`}
                  value={search[col] || ""}
                  onChange={(e) => setSearch((s) => ({ ...s, [col]: e.target.value }))}
                />
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setColumnValues(col, options[col] || [])}
                    disabled={(options[col] || []).length === 0}
                  >
                    Select all ({(options[col] || []).length || 0})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setColumnValues(col, [])}
                    disabled={(filters[col] || []).length === 0}
                  >
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                  {(options[col] || []).map((v) => (
                    <button
                      key={v}
                      onClick={() => toggleValue(col, v)}
                      className={`px-2 py-1 rounded border text-sm hover:bg-accent transition ${
                        (filters[col] || []).includes(v) ? "bg-accent" : ""
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {(filters[col] || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {(filters[col] || []).map((v) => (
                      <Badge key={v} variant="secondary" className="cursor-pointer" onClick={() => toggleValue(col, v)}>
                        {v} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
