import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAI } from "@/contexts/AIContext";
import { reindexRAG } from "@/services/ragApi";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { listFiles } from "@/services/filesApi";
import { MultiSelect } from "@/components/ui/multi-select";

export function IndexManagement() {
  const { indexStatus, setIndexStatus, isIndexing, setIsIndexing } = useAI();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const { data: filesData } = useQuery({
    queryKey: ["files"],
    queryFn: listFiles,
  });

  const handleReindex = async () => {
    setIsIndexing(true);
    try {
      const result = await reindexRAG({
        source_files: selectedFiles.length > 0 ? selectedFiles : undefined,
      });
      
      setIndexStatus(result);
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
            <Badge variant="outline" className="gap-2">
              <CheckCircle2 className="h-3 w-3" />
              v{indexStatus.dataset_version}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File scope selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Scope (optional)</label>
          <MultiSelect
            options={filesData?.files.map(f => ({ 
              value: f.file_id, 
              label: f.filename 
            })) || []}
            selected={selectedFiles}
            onChange={setSelectedFiles}
            placeholder="All files"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to index all data
          </p>
        </div>

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
            <AlertTriangle className="h-3 w-3 inline mr-1" />
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
