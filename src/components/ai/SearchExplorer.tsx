import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Loader2, ChevronDown, Plus, Copy } from "lucide-react";
import { searchRAG } from "@/services/ragApi";
import { toast } from "@/hooks/use-toast";
import type { RAGSearchHit } from "@/types/api";
import { useAI } from "@/contexts/AIContext";

export function SearchExplorer() {
  const { setSuggestedQuery } = useAI();
  const [query, setQuery] = useState("");
  const [k, setK] = useState(5);
  const [results, setResults] = useState<RAGSearchHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Empty query",
        description: "Please enter a search query",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await searchRAG({ question: query, k });
      setResults(response.hits);
      
      if (response.hits.length === 0) {
        toast({
          title: "No results found",
          description: "Try rephrasing your query or building the index first",
        });
      }
    } catch (error: any) {
      const message = error.message || "Search failed";
      
      if (message.includes("404") || message.includes("index")) {
        toast({
          title: "Index not found",
          description: "Please build the AI index first using the panel above",
          variant: "destructive",
        });
      } else if (message.includes("429")) {
        toast({
          title: "Rate limit exceeded",
          description: "Please wait a moment before searching again",
          variant: "destructive",
        });
      } else if (message.includes("API key")) {
        toast({
          title: "API configuration error",
          description: "OpenAI API key not configured properly",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search failed",
          description: message,
          variant: "destructive",
        });
      }
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToQuery = (hit: RAGSearchHit) => {
    const { column_name, dtype, sample_values } = hit.metadata;
    
    // Generate contextual query suggestions based on column type
    let suggestedText = "";
    
    if (dtype === "string" && sample_values && sample_values.length > 0) {
      // Categorical column - suggest filtering
      const topValue = sample_values[0];
      suggestedText = `Show me all records where ${column_name} is "${topValue}"`;
    } else if (dtype === "number" || dtype === "float" || dtype === "integer") {
      // Numeric column - suggest aggregation
      suggestedText = `What is the average ${column_name}?`;
    } else if (dtype === "date" || dtype === "datetime") {
      // Date column - suggest time-based query
      suggestedText = `Show me records from the last month by ${column_name}`;
    } else {
      // Generic fallback
      suggestedText = `Tell me about the ${column_name} column`;
    }
    
    setSuggestedQuery(suggestedText);
    
    toast({
      title: "Query suggestion added",
      description: "Check the conversation area below",
    });
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          RAG Retrieval Explorer
        </CardTitle>
        <CardDescription>
          Test semantic search across your dataset schema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage examples */}
        <Alert>
          <AlertDescription className="text-xs space-y-1">
            <p className="font-medium">Example queries:</p>
            <p>• "customer contact information"</p>
            <p>• "dates and timestamps"</p>
            <p>• "monetary values and prices"</p>
          </AlertDescription>
        </Alert>

        {/* Search input */}
        <div className="space-y-2">
          <Input
            placeholder="Search for columns by concept..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Results:</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              className="w-20 h-8"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              size="sm"
              className="flex-1"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {results.map((hit, idx) => (
            <Collapsible key={idx}>
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {hit.metadata.column_name}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {hit.metadata.dtype}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Score: {(hit.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {hit.text}
                    </p>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="space-y-2 pt-2 border-t">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Distinct:</span>{" "}
                      <span className="font-medium">{hit.metadata.distinct_count || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Nulls:</span>{" "}
                      <span className="font-medium">{hit.metadata.null_count || 0}</span>
                    </div>
                    {hit.metadata.min_value !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Min:</span>{" "}
                        <span className="font-medium">{String(hit.metadata.min_value)}</span>
                      </div>
                    )}
                    {hit.metadata.max_value !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Max:</span>{" "}
                        <span className="font-medium">{String(hit.metadata.max_value)}</span>
                      </div>
                    )}
                  </div>

                  {hit.metadata.sample_values && hit.metadata.sample_values.length > 0 && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Sample values:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {hit.metadata.sample_values.slice(0, 5).map((val, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {val}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => handleAddToQuery(hit)}
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Suggest Query
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        navigator.clipboard.writeText(hit.metadata.column_name);
                        toast({ 
                          title: "Copied", 
                          description: `${hit.metadata.column_name} copied to clipboard` 
                        });
                      }}
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy Name
                    </Button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        {results.length === 0 && !isSearching && query && (
          <div className="text-center text-sm text-muted-foreground py-8">
            No results found. Try a different query or build the index first.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
