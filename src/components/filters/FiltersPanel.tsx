import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useDebounce } from "@/hooks/useDebounce";
import { request, getApiConfig } from "@/services/apiClient";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { motion, AnimatePresence } from "framer-motion";
import { FacetsRequest, FacetsResponse, FacetValue } from "@/types/api";

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
  const debounced = useDebounce(search, 200);
  const [facets, setFacets] = useState<Record<string, FacetValue[]>>({});
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({});
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  const INITIAL_VISIBLE_COUNT = 50;
  const LOAD_MORE_COUNT = 50;

  const fetchFacets = async (visibleColumns: string[]) => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(prev => visibleColumns.reduce((acc, col) => ({ ...acc, [col]: true }), prev));

      const request: FacetsRequest = {
        filters,
        fields: visibleColumns,
        exclude_self: true,
        include_empty: false,
        order: "count_desc"
      };

      const { baseUrl, apiKey } = getApiConfig();
      const url = `${baseUrl}/facets`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      
      const data: FacetsResponse = await response.json();
      
      // Apply search filters to the facets
      const filteredFacets: Record<string, FacetValue[]> = {};
      visibleColumns.forEach(col => {
        const searchTerm = debounced[col]?.toLowerCase() || "";
        const columnFacets = data.facets[col] || [];
        filteredFacets[col] = searchTerm 
          ? columnFacets.filter(f => f.value.toLowerCase().includes(searchTerm))
          : columnFacets;
      });
      
      setFacets(prev => ({ ...prev, ...filteredFacets }));
      setTotalRows(data.total);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch facets:', error);
      }
    } finally {
      setLoading(prev => visibleColumns.reduce((acc, col) => ({ ...acc, [col]: false }), prev));
    }
  };

  // Fetch facets when filters change, visible columns change, or search terms change
  useEffect(() => {
    if (open.length > 0) {
      fetchFacets(open);
    }
  }, [filters, open, debounced, refreshKey]);

  // Clear facets when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      setFacets({});
      setVisibleCounts({});
    }
  }, [refreshKey]);

  // Initialize visible counts when new columns are opened
  useEffect(() => {
    const newVisibleCounts = { ...visibleCounts };
    open.forEach(col => {
      if (!(col in newVisibleCounts)) {
        newVisibleCounts[col] = INITIAL_VISIBLE_COUNT;
      }
    });
    setVisibleCounts(newVisibleCounts);
  }, [open]);

  const loadMoreValues = useCallback((col: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [col]: (prev[col] || INITIAL_VISIBLE_COUNT) + LOAD_MORE_COUNT
    }));
  }, []);

  const getVisibleFacets = useCallback((col: string) => {
    const allFacets = facets[col] || [];
    const visibleCount = visibleCounts[col] || INITIAL_VISIBLE_COUNT;
    return allFacets.slice(0, visibleCount);
  }, [facets, visibleCounts]);

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
                       {facets[col] && (
                         <motion.span 
                           className="text-xs text-muted-foreground px-2 py-1 rounded-md bg-muted"
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           transition={{ duration: 0.2 }}
                         >
                           <AnimatedCounter value={(facets[col] || []).length} />
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
                        {loading[col] && (
                          <motion.div
                            className="glass-panel h-3 w-3 rounded-full overflow-hidden relative"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full"
                              animate={{
                                rotate: [0, 360],
                                scale: [0.8, 1.2, 0.8],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                            <motion.div
                              className="absolute inset-0.5 bg-background/20 rounded-full"
                              animate={{
                                scale: [1, 0.8, 1],
                                opacity: [0.3, 0.8, 0.3]
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 0.2
                              }}
                            />
                          </motion.div>
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
                           onClick={() => setColumnValues(col, (facets[col] || []).map(f => f.value))}
                           disabled={(facets[col] || []).length === 0}
                           className="button-smooth"
                         >
                           Select all (<AnimatedCounter value={(facets[col] || []).length || 0} />)
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
                     <div className="space-y-2">
                        {loading[col] ? (
                          <motion.div
                            className="glass-panel p-4 rounded-lg min-h-32 flex items-center justify-center relative overflow-hidden"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          >
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
                              animate={{
                                background: [
                                  "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05), transparent)",
                                  "linear-gradient(225deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.08), transparent)",
                                  "linear-gradient(315deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.05), transparent)"
                                ]
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                            <motion.div className="flex flex-col items-center gap-3 relative z-10">
                              <motion.div
                                className="glass-button w-8 h-8 rounded-full flex items-center justify-center"
                                animate={{
                                  scale: [1, 1.1, 1],
                                  rotate: [0, 180, 360]
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                <motion.div
                                  className="w-4 h-4 border-2 border-primary rounded-full border-t-transparent"
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear"
                                  }}
                                />
                              </motion.div>
                              <motion.span
                                className="text-sm text-muted-foreground font-medium"
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                              >
                                Loading filter values...
                              </motion.span>
                            </motion.div>
                            <motion.div
                              className="absolute -inset-2 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
                              animate={{
                                x: ["-100%", "100%"],
                                opacity: [0, 1, 0]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          </motion.div>
                        ) : (
                          <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                           {getVisibleFacets(col).map((facet, valIndex) => {
                            const isSelected = (filters[col] || []).includes(facet.value);
                            return (
                              <motion.button
                                key={facet.value}
                                onClick={() => toggleValue(col, facet.value)}
                                className={`px-2 py-1 rounded border text-sm transition-all duration-200 hover:scale-105 flex items-center gap-1 ${
                                  isSelected ? "bg-accent shadow-md" : "hover:bg-accent/50"
                                }`}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.1, delay: Math.min(valIndex * 0.01, 0.5) }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <span>{facet.value}</span>
                                <motion.span 
                                  className="text-xs opacity-70 bg-background/50 px-1 rounded"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <AnimatedCounter value={facet.count} />
                                </motion.span>
                              </motion.button>
                            );
                           })}
                          </div>
                        )}
                        
                        {(facets[col] || []).length > (visibleCounts[col] || INITIAL_VISIBLE_COUNT) && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex justify-center"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadMoreValues(col)}
                              className="button-smooth text-xs"
                            >
                              Load {Math.min(LOAD_MORE_COUNT, (facets[col] || []).length - (visibleCounts[col] || INITIAL_VISIBLE_COUNT))} more values
                            </Button>
                          </motion.div>
                        )}
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
