import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { searchRAG } from "@/services/ragApi";
import { toast } from "@/hooks/use-toast";
import type { RAGSearchHit } from "@/types/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SearchExplorer() {
  const [query, setQuery] = useState("");
  const [k, setK] = useState(5);
  const [results, setResults] = useState<RAGSearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await searchRAG({ question: query, k });
      setResults(response.hits);
      
      if (response.hits.length === 0) {
        toast({
          title: "No results found",
          description: "Try rebuilding the index or adjusting your query",
        });
      }
    } catch (error: any) {
      const message = error.message || "Search failed";
      if (message.includes("index") || message.includes("404")) {
        toast({
          title: "Index not found",
          description: "Please build the AI index first in the Index Management section",
          variant: "destructive",
        });
      } else if (error.status === 429) {
        toast({
          title: "Rate limit exceeded",
          description: "OpenAI API rate limit reached. Please wait and retry.",
          variant: "destructive",
        });
      } else if (error.status === 401) {
        toast({
          title: "API Key Missing",
          description: "OpenAI API key not configured on the backend",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search failed",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          RAG Retrieval Explorer
        </CardTitle>
        <CardDescription>
          Test semantic search against your dataset schema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Try: "Which columns contain location data?" or "Show customer fields"
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Input
            placeholder="e.g., Which columns contain location data?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Input
            type="number"
            className="w-16"
            min={1}
            max={20}
            value={k}
            onChange={(e) => setK(parseInt(e.target.value) || 5)}
            title="Number of results (k)"
          />
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">
              Found {results.length} relevant column{results.length !== 1 ? 's' : ''}
            </div>
            {results.map((hit, idx) => (
              <Collapsible key={idx}>
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{hit.metadata.column_name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {hit.text}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline">
                        {(hit.score * 100).toFixed(1)}%
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  
                  <CollapsibleContent className="space-y-2 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Type:</span>{" "}
                        <code className="bg-muted px-1 py-0.5 rounded">{hit.metadata.dtype}</code>
                      </div>
                      {hit.metadata.distinct_count !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Distinct:</span>{" "}
                          {hit.metadata.distinct_count.toLocaleString()}
                        </div>
                      )}
                      {hit.metadata.null_count !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Nulls:</span>{" "}
                          {hit.metadata.null_count.toLocaleString()}
                        </div>
                      )}
                      {hit.metadata.sample_values && hit.metadata.sample_values.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Samples:</span>{" "}
                          <span className="text-xs">{hit.metadata.sample_values.slice(0, 3).join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
