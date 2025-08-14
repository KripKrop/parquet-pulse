import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface TableRowSkeletonProps {
  columnCount: number;
  index: number;
}

export const TableRowSkeleton: React.FC<TableRowSkeletonProps> = ({ 
  columnCount, 
  index 
}) => {
  return (
    <motion.div 
      className="contents"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay: Math.min(index * 0.05, 0.5),
        ease: "easeOut"
      }}
    >
      {Array.from({ length: columnCount }).map((_, cellIndex) => (
        <div
          key={`skeleton-${index}-${cellIndex}`}
          className="px-4 py-3 h-12 border-b flex items-center"
        >
          <motion.div
            initial={{ width: "60%" }}
            animate={{ width: `${60 + Math.random() * 30}%` }}
            transition={{ 
              duration: 0.8, 
              delay: cellIndex * 0.1,
              ease: "easeInOut"
            }}
            className="w-full"
          >
            <Skeleton 
              className="h-4 w-full bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse"
              style={{
                animationDelay: `${cellIndex * 0.1}s`,
                animationDuration: `${1.5 + Math.random() * 0.5}s`
              }}
            />
          </motion.div>
        </div>
      ))}
    </motion.div>
  );
};