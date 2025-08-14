import { Button } from "@/components/ui/button";
import { useDownload } from "@/contexts/DownloadContext";
import { motion } from "framer-motion";

export const DownloadCsv: React.FC<{
  filters: Record<string, string[]>;
  fields?: string[];
}> = ({ filters, fields }) => {
  const { startDownload } = useDownload();

  const handleDownload = () => {
    startDownload(filters, fields);
  };

  return (
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
  );
};
