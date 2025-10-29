import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  RotateCcw, 
  Download, 
  ExternalLink, 
  AlertCircle, 
  ChevronDown,
  Sparkles,
  Bookmark,
  Copy,
  Trash2
} from "lucide-react";
import { useAI } from "@/contexts/AIContext";
import { useDatasetVersion } from "@/hooks/useDatasetVersionCheck";
import { askQuestion } from "@/services/ragApi";
import { toast } from "@/hooks/use-toast";
import type { AskResponse } from "@/types/api";
import { exportToCSV } from "@/utils/csvExport";
import { encodeFilters } from "@/utils/filterEncoding";
import { useNavigate } from "react-router-dom";
import type { ConversationItem as ConversationItemType, SavedQuery } from "@/contexts/AIContext";

export function ConversationWorkspace() {
  const { 
    conversationHistory, 
    addToHistory, 
    clearHistory, 
    suggestedQuery, 
    setSuggestedQuery,
    indexStatus,
    savedQueries,
    addSavedQuery,
    removeSavedQuery
  } = useAI();
  const { data: currentVersion } = useDatasetVersion();
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showSavedQueries, setShowSavedQueries] = useState(false);

  const isStale = indexStatus && 
                  currentVersion && 
                  currentVersion !== "unknown" &&
                  indexStatus.dataset_version !== currentVersion;

  // Watch for suggested queries from SearchExplorer
  useEffect(() => {
    if (suggestedQuery) {
      setQuestion(suggestedQuery);
      setSuggestedQuery(null);
    }
  }, [suggestedQuery, setSuggestedQuery]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  const handleAsk = async () => {
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");
    setIsAsking(true);

    try {
      // Build conversation history from past exchanges
      const conversationContext = conversationHistory.flatMap(item => [
        { role: "user" as const, content: item.question },
        { 
          role: "assistant" as const, 
          content: item.response.text || JSON.stringify({
            intent: item.response.intent,
            applied_filters: item.response.applied_filters,
            used_fields: item.response.used_fields,
            rows_returned: item.response.rows?.length || 0
          })
        }
      ]);

      const response = await askQuestion({ 
        question: currentQuestion,
        conversation_history: conversationContext
      });
      
      addToHistory(currentQuestion, response);
    } catch (error: any) {
      toast({
        title: "Query failed",
        description: error.message || "Failed to process your question",
        variant: "destructive",
      });
      addToHistory(currentQuestion, { error: error.message || "Query failed" } as AskResponse);
    } finally {
      setIsAsking(false);
    }
  };

  const handleSaveQuery = () => {
    if (!question.trim()) {
      toast({
        title: "Cannot save empty query",
        variant: "destructive"
      });
      return;
    }

    const name = prompt("Name this query:") || "Untitled Query";
    const saved: SavedQuery = {
      id: crypto.randomUUID(),
      name,
      question: question,
      timestamp: new Date()
    };
    
    addSavedQuery(saved);
    toast({
      title: "Query saved",
      description: `"${name}" saved to your collection`
    });
  };

  const handleLoadSavedQuery = (query: SavedQuery) => {
    setQuestion(query.question);
    setShowSavedQueries(false);
    toast({
      title: "Query loaded",
      description: `Loaded "${query.name}"`
    });
  };

  const handleExportAllResults = () => {
    const dataResponses = conversationHistory.filter(
      item => item.response.rows && item.response.rows.length > 0
    );
    
    if (dataResponses.length === 0) {
      toast({
        title: "No data to export",
        description: "Your conversation doesn't contain any data results",
        variant: "destructive"
      });
      return;
    }

    dataResponses.forEach((item, index) => {
      const questionSlug = item.question
        .slice(0, 20)
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase();
      
      const filename = `ai-conversation-${index + 1}-${questionSlug}.csv`;
      
      exportToCSV(
        item.response.rows!,
        item.response.used_fields || Object.keys(item.response.rows![0] || {}),
        filename
      );
    });
    
    toast({
      title: "Exported all results",
      description: `${dataResponses.length} CSV files downloaded`
    });
  };

  return (
    <Card className="glass-card h-[calc(100vh-12rem)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Ask Questions
        </CardTitle>
        <div className="flex items-center gap-2">
          {isStale && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Index Outdated
            </Badge>
          )}
          {conversationHistory.some(h => h.response.rows?.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportAllResults}
            >
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSavedQueries(!showSavedQueries)}
          >
            <Bookmark className="h-4 w-4 mr-2" />
            Saved ({savedQueries.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            disabled={conversationHistory.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-5rem)] space-y-4">
        {/* Saved queries panel */}
        {showSavedQueries && (
          <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Saved Queries</span>
              <Button variant="ghost" size="sm" onClick={() => setShowSavedQueries(false)}>
                Close
              </Button>
            </div>
            {savedQueries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved queries yet</p>
            ) : (
              <div className="space-y-2">
                {savedQueries.map((query) => (
                  <div key={query.id} className="flex items-center justify-between gap-2 p-2 bg-background rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{query.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{query.question}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLoadSavedQuery(query)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          removeSavedQuery(query.id);
                          toast({ title: "Query deleted" });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conversation history */}
        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          <div className="space-y-4">
            {conversationHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Ask a question about your data to get started</p>
                <p className="text-xs mt-2">Try: "Show me all records" or "What columns do I have?"</p>
              </div>
            ) : (
              conversationHistory.map((item) => (
                <ConversationItem key={item.id} item={item} />
              ))
            )}
            {isAsking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area with suggestion indicator */}
        <div className="space-y-2 pt-4 border-t">
          {question && question === suggestedQuery && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Query suggestion from RAG search
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your data..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              disabled={isAsking}
              className="flex-1"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveQuery}
              disabled={!question.trim()}
              title="Save query"
            >
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleAsk} 
              disabled={isAsking || !question.trim()}
            >
              {isAsking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConversationItem({ item }: { item: ConversationItemType }) {
  const response: AskResponse = item.response;
  const navigate = useNavigate();

  const handleExport = () => {
    if (!response.rows || response.rows.length === 0) {
      toast({
        title: "Nothing to export",
        description: "This response doesn't contain any data rows",
        variant: "destructive"
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split("T")[0];
      const questionSlug = item.question
        .slice(0, 30)
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase();
      const filename = `ai-query-${questionSlug}-${timestamp}.csv`;
      
      exportToCSV(
        response.rows,
        response.used_fields || Object.keys(response.rows[0] || {}),
        filename
      );
      
      toast({
        title: "Export successful",
        description: `Exported ${response.rows.length} rows to ${filename}`
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleViewInExplorer = () => {
    if (!response.applied_filters || Object.keys(response.applied_filters).length === 0) {
      navigate("/");
      return;
    }

    const encodedFilters = encodeFilters(response.applied_filters);
    navigate(`/?f=${encodedFilters}`);
    
    toast({
      title: "Opening Data Explorer",
      description: "Filters have been applied"
    });
  };

  if (response.error) {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium">Q</span>
          </div>
          <div className="flex-1 bg-muted/30 rounded-lg p-3">
            <p className="text-sm">{item.question}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
          <Alert variant="destructive" className="flex-1">
            <AlertDescription className="text-sm">
              {response.error}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* User question */}
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-medium">Q</span>
        </div>
        <div className="flex-1 bg-muted/30 rounded-lg p-3">
          <p className="text-sm">{item.question}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {item.timestamp.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* AI response */}
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 space-y-3">
          {/* Intent badge */}
          <Badge variant={response.intent === "data" ? "default" : "secondary"}>
            {response.intent === "data" ? "Data Query" : "Description"}
          </Badge>

          {/* Narrative text */}
          {response.text && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm whitespace-pre-wrap">{response.text}</p>
            </div>
          )}

          {/* Applied filters */}
          {response.applied_filters && Object.keys(response.applied_filters).length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Applied Filters</span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(response.applied_filters).map(([col, vals]) => (
                  <Badge key={col} variant="outline" className="text-xs">
                    {col}: {vals.join(", ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Used fields */}
          {response.used_fields && response.used_fields.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Fields Used</span>
              <div className="flex flex-wrap gap-1">
                {response.used_fields.map((field) => (
                  <Badge key={field} variant="secondary" className="text-xs font-mono">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Data table */}
          {response.rows && response.rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Showing {response.rows.length} of {response.total} rows
                </span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        {(response.used_fields || Object.keys(response.rows[0])).map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-medium text-xs">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {response.rows.map((row, idx) => (
                        <tr key={idx} className="border-t hover:bg-muted/30">
                          {(response.used_fields || Object.keys(row)).map((col) => (
                            <td key={col} className="px-3 py-2 text-xs">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RAG context quality visualization */}
          {response.context && response.context.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-xs">RAG Context ({response.context.length} columns)</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {response.context.map((card, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                    <div className="flex-1">
                      <Progress value={card.score * 100} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {(card.score * 100).toFixed(0)}%
                    </span>
                    <span className="text-xs font-medium font-mono">
                      {card.metadata.column_name}
                    </span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Planner text */}
          {response.planner_text && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-xs">View Planner Reasoning</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                  {response.planner_text}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Quick Actions Toolbar */}
          {response.intent === "data" && (
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Quick Actions:</span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleViewInExplorer}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Explore
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExport}
                disabled={!response.rows || response.rows.length === 0}
              >
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(item.question);
                  toast({ title: "Question copied to clipboard" });
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Query
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
