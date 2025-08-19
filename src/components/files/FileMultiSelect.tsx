import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, File, Calendar, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { listFiles } from "@/services/filesApi";
import { formatBytes, formatDate } from "@/lib/formatters";

interface FileMultiSelectProps {
  selectedFiles: string[];
  onSelectionChange: (fileIds: string[]) => void;
  className?: string;
}

export function FileMultiSelect({ selectedFiles, onSelectionChange, className }: FileMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: filesData, isLoading, error } = useQuery({
    queryKey: ["files"],
    queryFn: listFiles,
    staleTime: 30000, // 30 seconds
    gcTime: 300000,   // 5 minutes
  });

  const files = filesData?.files || [];
  const selectedFilesData = files.filter(f => selectedFiles.includes(f.file_id));

  const handleToggleFile = (fileId: string) => {
    const isSelected = selectedFiles.includes(fileId);
    if (isSelected) {
      onSelectionChange(selectedFiles.filter(id => id !== fileId));
    } else {
      onSelectionChange([...selectedFiles, fileId]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gradient-primary">Filter by Files</span>
        {selectedFiles.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll} className="h-6 px-2 text-xs">
            Clear All
          </Button>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between h-auto min-h-[2.5rem] p-2",
              selectedFiles.length === 0 && "text-muted-foreground"
            )}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {selectedFiles.length === 0 ? (
                <span className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Select files to filter...
                </span>
              ) : (
                <AnimatePresence>
                  {selectedFilesData.slice(0, 3).map((file) => (
                    <motion.div
                      key={file.file_id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.1 }}
                    >
                      <Badge variant="secondary" className="text-xs">
                        {file.filename} ({file.current_row_count})
                      </Badge>
                    </motion.div>
                  ))}
                  {selectedFiles.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{selectedFiles.length - 3} more
                    </Badge>
                  )}
                </AnimatePresence>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search files..." className="h-9" />
            <CommandList className="max-h-64">
              <CommandEmpty>
                {isLoading ? "Loading files..." : "No files found."}
              </CommandEmpty>
              {!isLoading && (
                <CommandGroup>
                  {files.map((file) => {
                    const isSelected = selectedFiles.includes(file.file_id);
                    
                    return (
                      <CommandItem
                        key={file.file_id}
                        value={`${file.filename} ${file.file_id}`}
                        onSelect={() => handleToggleFile(file.file_id)}
                        className="flex items-center gap-2 p-2"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                          )}>
                            <Check className={cn("h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <File className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate text-sm">{file.filename}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {file.current_row_count.toLocaleString()}
                              </Badge>
                            </div>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(file.uploaded_at)}
                                  </span>
                                  {file.size_bytes && (
                                    <span className="flex items-center gap-1">
                                      <HardDrive className="h-3 w-3" />
                                      {formatBytes(file.size_bytes)}
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="space-y-1 text-xs">
                                  <div><strong>File ID:</strong> {file.file_id}</div>
                                  <div><strong>Uploaded:</strong> {formatDate(file.uploaded_at, true)}</div>
                                  <div><strong>Rows:</strong> {file.current_row_count.toLocaleString()}</div>
                                  {file.size_bytes && (
                                    <div><strong>Size:</strong> {formatBytes(file.size_bytes)}</div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedFiles.length > 0 && (
        <motion.div 
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          Filtering data from {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
        </motion.div>
      )}
    </div>
  );
}