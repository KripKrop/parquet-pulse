import { Button } from "@/components/ui/button";
import { useDownload } from "@/contexts/DownloadContext";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const DownloadCsv: React.FC<{
  filters: Record<string, string[]>;
  fields?: string[];
}> = ({ filters, fields }) => {
  const { startDownload } = useDownload();

  const handleDownload = () => {
    startDownload(filters, fields);
  };

  const handleExportAll = () => {
    // Export with empty filters to get all data
    startDownload({}, fields);
  };

  const hasFilters = Object.keys(filters).length > 0;

  return (
    <div className="flex items-center gap-2">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button 
          variant="secondary" 
          className="button-smooth liquid-bounce"
          onClick={handleDownload}
        >
          📥 Download CSV
        </Button>
      </motion.div>
      
      {hasFilters && (
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="outline" 
                className="button-smooth"
                onClick={handleExportAll}
              >
                📦 Export All
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Export entire dataset without filters</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
