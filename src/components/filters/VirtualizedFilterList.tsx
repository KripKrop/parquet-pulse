import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { FacetValue } from "@/types/api";
import { FixedSizeList as List } from "react-window";

interface VirtualizedFilterListProps {
  facets: FacetValue[];
  selectedValues: string[];
  onToggleValue: (value: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  maxHeight?: number;
}

const ITEM_HEIGHT = 36; // Height of each filter item
const CHUNK_SIZE = 1000; // Process in chunks to avoid blocking UI

interface FilterItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    facets: FacetValue[];
    selectedValues: Set<string>;
    onToggleValue: (value: string) => void;
  };
}

const FilterItem: React.FC<FilterItemProps> = ({ index, style, data }) => {
  const { facets, selectedValues, onToggleValue } = data;
  const facet = facets[index];
  
  if (!facet) return null;
  
  const isSelected = selectedValues.has(facet.value);
  
  return (
    <div style={style}>
      <motion.button
        onClick={() => onToggleValue(facet.value)}
        className={`w-full px-3 py-2 rounded-md border text-sm transition-all duration-200 hover:scale-[1.02] flex items-center justify-between ${
          isSelected 
            ? "bg-accent shadow-md border-primary/20" 
            : "hover:bg-accent/50 border-border"
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.1 }}
      >
        <span className="truncate flex-1 text-left">{facet.value}</span>
        <motion.span 
          className="text-xs opacity-70 bg-background/50 px-1.5 py-0.5 rounded-sm ml-2 flex-shrink-0"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <AnimatedCounter value={facet.count} />
        </motion.span>
      </motion.button>
    </div>
  );
};

export const VirtualizedFilterList: React.FC<VirtualizedFilterListProps> = ({
  facets,
  selectedValues,
  onToggleValue,
  onSelectAll,
  onClear,
  maxHeight = 320
}) => {
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
  const listRef = useRef<List>(null);

  // Chunked select all implementation to prevent UI blocking
  const handleSelectAll = useCallback(async () => {
    if (isSelectingAll) return;
    
    setIsSelectingAll(true);
    
    try {
      // For small datasets, process directly
      if (facets.length <= 1000) {
        onSelectAll();
        return;
      }
      
      // For large datasets, process in chunks to keep UI responsive
      const allValues = facets.map(f => f.value);
      const currentSelected = new Set(selectedValues);
      const newValues = allValues.filter(value => !currentSelected.has(value));
      
      // Process in chunks
      const chunkSize = 500;
      const chunks = [];
      for (let i = 0; i < newValues.length; i += chunkSize) {
        chunks.push(newValues.slice(i, i + chunkSize));
      }
      
      // Process each chunk with a small delay
      for (let i = 0; i < chunks.length; i++) {
        await new Promise(resolve => {
          setTimeout(() => {
            chunks[i].forEach(value => {
              if (!currentSelected.has(value)) {
                onToggleValue(value);
                currentSelected.add(value);
              }
            });
            resolve(void 0);
          }, 0);
        });
        
        // Yield control every few chunks for very large datasets
        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    } catch (error) {
      console.error('Error during select all:', error);
    } finally {
      setIsSelectingAll(false);
    }
  }, [facets, selectedValues, onToggleValue, onSelectAll, isSelectingAll]);

  const itemData = useMemo(() => ({
    facets,
    selectedValues: selectedSet,
    onToggleValue
  }), [facets, selectedSet, onToggleValue]);

  return (
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSelectAll}
            disabled={facets.length === 0 || isSelectingAll}
            className="button-smooth"
          >
            {isSelectingAll ? (
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-3 h-3 border-2 border-current rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                Selecting...
              </div>
            ) : (
              <>
                Select all (<AnimatedCounter value={facets.length} />)
              </>
            )}
          </Button>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={selectedValues.length === 0}
            className="button-smooth"
          >
            Clear (<AnimatedCounter value={selectedValues.length} />)
          </Button>
        </motion.div>
      </div>

      {facets.length > 0 && (
        <motion.div
          className="glass-panel rounded-lg border"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <List
            ref={listRef}
            height={Math.min(maxHeight, facets.length * ITEM_HEIGHT)}
            width="100%"
            itemCount={facets.length}
            itemSize={ITEM_HEIGHT}
            itemData={itemData}
            className="scrollbar-virtualized"
          >
            {FilterItem}
          </List>
        </motion.div>
      )}

      {facets.length === 0 && (
        <motion.div
          className="text-center text-muted-foreground py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          No values found
        </motion.div>
      )}
    </motion.div>
  );
};