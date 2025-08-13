import { useEffect, useMemo, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/hooks/useDebounce";
import { request } from "@/services/apiClient";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { motion, AnimatePresence } from "framer-motion";

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

  // when refreshKey changes, refetch all visible columns and clear cached options
  useEffect(() => {
    if (refreshKey > 0) {
      setOptions({});
      open.forEach((col) => fetchDistinct(col, debounced[col]));
    }
  }, [refreshKey]);

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
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <motion.div 
          className="text-sm text-muted-foreground flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-gradient-primary font-medium">Filters</span>
          {totalSelected > 0 && (
            <motion.span 
              className="bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <AnimatedCounter value={totalSelected} />
            </motion.span>
          )}
        </motion.div>
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button variant="secondary" size="sm" onClick={clearAll} className="button-smooth">
              Clear All
            </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button size="sm" onClick={onApply} className="button-smooth">
              Apply
            </Button>
          </motion.div>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Separator />
      </motion.div>
      <Accordion type="multiple" value={open} onValueChange={(v) => setOpen(v as string[])} className="w-full">
        <AnimatePresence>
          {columns.map((col, index) => (
            <motion.div
              key={col}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
            >
              <AccordionItem value={col}>
                <AccordionTrigger className="text-left hover:bg-accent/30 transition-colors duration-200 rounded px-2">
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{col}</span>
                    <div className="flex items-center gap-2">
                      {options[col] && (
                        <motion.span 
                          className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <AnimatedCounter value={(options[col] || []).length} />
                        </motion.span>
                      )}
                      {(filters[col]?.length || 0) > 0 && (
                        <motion.span 
                          className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-md"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <AnimatedCounter value={filters[col]?.length || 0} />
                        </motion.span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <motion.div 
                    className="space-y-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Input
                      placeholder={`Search ${col}...`}
                      value={search[col] || ""}
                      onChange={(e) => setSearch((s) => ({ ...s, [col]: e.target.value }))}
                      className="transition-all duration-200 focus:ring-2"
                    />
                    <div className="flex items-center gap-2">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setColumnValues(col, options[col] || [])}
                          disabled={(options[col] || []).length === 0}
                          className="button-smooth"
                        >
                          Select all (<AnimatedCounter value={(options[col] || []).length || 0} />)
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setColumnValues(col, [])}
                          disabled={(filters[col] || []).length === 0}
                          className="button-smooth"
                        >
                          Clear
                        </Button>
                      </motion.div>
                    </div>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                      <AnimatePresence>
                        {(options[col] || []).map((v, valIndex) => (
                          <motion.button
                            key={v}
                            onClick={() => toggleValue(col, v)}
                            className={`px-2 py-1 rounded border text-sm transition-all duration-200 hover:scale-105 ${
                              (filters[col] || []).includes(v) ? "bg-accent shadow-md" : "hover:bg-accent/50"
                            }`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.1, delay: valIndex * 0.02 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {v}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </div>
                    {(filters[col] || []).length > 0 && (
                      <motion.div 
                        className="flex flex-wrap gap-2 pt-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      >
                        <AnimatePresence>
                          {(filters[col] || []).map((v) => (
                            <motion.div
                              key={v}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.1 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Badge 
                                variant="secondary" 
                                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-all duration-200" 
                                onClick={() => toggleValue(col, v)}
                              >
                                {v} ×
                              </Badge>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </motion.div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </AnimatePresence>
      </Accordion>
    </motion.div>
  );
};
