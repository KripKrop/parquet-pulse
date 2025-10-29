import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Database, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useAI } from "@/contexts/AIContext";
import { useDatasetVersion } from "@/hooks/useDatasetVersionCheck";
import { reindexRAG } from "@/services/ragApi";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { listFiles } from "@/services/filesApi";
import { MultiSelect } from "@/components/ui/multi-select";

export function IndexManagement() {
  const { indexStatus, setIndexStatus, isIndexing, setIsIndexing, lastIndexedFiles, setLastIndexedFiles } = useAI();
  const { data: currentVersion } = useDatasetVersion();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const { data: filesData } = useQuery({
    queryKey: ["files"],
    queryFn: listFiles,
  });

  const isStale = indexStatus && 
                  currentVersion && 
                  currentVersion !== "unknown" &&
                  indexStatus.dataset_version !== currentVersion;

  const handleReindex = async () => {
    setIsIndexing(true);
    try {
      const filesToIndex = selectedFiles.length > 0 ? selectedFiles : undefined;
      
      const result = await reindexRAG({
        source_files: filesToIndex,
      });
      
      setIndexStatus(result);
      setLastIndexedFiles(filesToIndex || filesData?.files.map(f => f.file_id) || []);
      
      toast({
        title: "Index rebuilt successfully",
        description: `Indexed ${result.cards_indexed} column cards from ${result.row_count.toLocaleString()} rows`,
      });
    } catch (error: any) {
      const message = error.message || "Failed to rebuild AI index";
      toast({
        title: "Indexing failed",
        description: message.includes("index") || message.includes("404")
          ? "Please ensure the RAG backend is configured properly"
          : message,
        variant: "destructive",
      });
    } finally {
      setIsIndexing(false);
    }
  };

  // Enhance file options with metadata
  const fileOptions = (filesData?.files || []).map(f => {
    const isIndexed = lastIndexedFiles.includes(f.file_id);
    const isNew = !isIndexed && indexStatus !== null;
    
    return {
      value: f.file_id,
      label: `${f.filename} ${isNew ? "🆕" : isIndexed ? "✓" : ""}`,
      metadata: {
        uploaded: f.uploaded_at,
        rows: f.current_row_count,
        indexed: isIndexed,
        isNew: isNew
      }
    };
  });

  const selectedRowCount = filesData?.files
    .filter(f => selectedFiles.includes(f.file_id))
    .reduce((sum, f) => sum + (f.current_row_count || 0), 0) || 0;

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              AI Knowledge Index
            </CardTitle>
            <CardDescription>
              Build semantic index for natural language queries
            </CardDescription>
          </div>
          {indexStatus && (
            <Badge 
              variant={isStale ? "destructive" : "outline"} 
              className="gap-2"
            >
              {isStale ? (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Outdated
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  v{indexStatus.dataset_version}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stale index warning banner */}
        {isStale && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                Index is outdated. Dataset version changed from{" "}
                <code className="bg-background/20 px-1 rounded">
                  {indexStatus?.dataset_version}
                </code>{" "}
                to{" "}
                <code className="bg-background/20 px-1 rounded">
                  {currentVersion}
                </code>
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleReindex}
                disabled={isIndexing}
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Rebuilding...
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3 mr-2" />
                    Auto-rebuild
                  </>
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* File scope selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Scope (optional)</label>
            {selectedFiles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles([])}
              >
                Select All
              </Button>
            )}
          </div>
          
          <MultiSelect
            options={fileOptions.map(f => ({
              value: f.value,
              label: f.label
            }))}
            selected={selectedFiles}
            onChange={setSelectedFiles}
            placeholder="All files (recommended)"
          />
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Leave empty to index all files (recommended)</p>
            <p>• Select specific files to rebuild only their columns</p>
            {indexStatus && lastIndexedFiles.length > 0 && (
              <p className="text-primary">
                • Current index includes {lastIndexedFiles.length} file(s)
              </p>
            )}
          </div>
        </div>

        {/* Show file breakdown when specific files are selected */}
        {selectedFiles.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Indexing {selectedFiles.length} selected file(s).{" "}
              {selectedRowCount.toLocaleString()} rows will be profiled.
            </AlertDescription>
          </Alert>
        )}

        {/* Index statistics */}
        {indexStatus && (
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
            <div>
              <div className="text-xs text-muted-foreground">Rows</div>
              <div className="text-lg font-semibold">{indexStatus.row_count.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Columns</div>
              <div className="text-lg font-semibold">{indexStatus.column_count}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cards</div>
              <div className="text-lg font-semibold">{indexStatus.cards_indexed}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Tenant</div>
              <div className="text-xs font-mono truncate">{indexStatus.tenant_id}</div>
            </div>
          </div>
        )}

        {/* Action button */}
        <Button
          onClick={handleReindex}
          disabled={isIndexing}
          className="w-full"
        >
          {isIndexing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Rebuilding Index...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              {indexStatus ? "Rebuild Index" : "Build Index"}
            </>
          )}
        </Button>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            Index artifacts stored in /data/rag (FAISS + JSON)
          </p>
          <p className="text-xs text-muted-foreground">
            Indexing may take several seconds for large datasets
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
