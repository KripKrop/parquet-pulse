import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageSquare, Send, Loader2, ChevronDown, RotateCcw, AlertCircle } from "lucide-react";
import { useAI } from "@/contexts/AIContext";
import { askQuestion } from "@/services/ragApi";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AskResponse } from "@/types/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ConversationWorkspace() {
  const { conversationHistory, addToHistory, clearHistory } = useAI();
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [conversationHistory]);

  const handleAsk = async () => {
    if (!question.trim()) return;

    const currentQuestion = question;
    setQuestion("");
    setIsAsking(true);

    try {
      const response = await askQuestion({ question: currentQuestion });
      addToHistory(currentQuestion, response);
    } catch (error: any) {
      const message = error.message || "Query failed";
      
      // Show appropriate error message
      if (message.includes("index") || message.includes("404")) {
        toast({
          title: "Index not found",
          description: "Please build the AI index first",
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
          description: "OpenAI API key not configured",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Query failed",
          description: message,
          variant: "destructive",
        });
      }
      
      // Still add to history to show the error
      addToHistory(currentQuestion, { error: message } as any);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <Card className="glass-card h-[calc(100vh-12rem)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Ask Questions
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          disabled={conversationHistory.length === 0}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-5rem)] space-y-4">
        {/* Conversation history */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4">
            {conversationHistory.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 space-y-4">
                <MessageSquare className="h-12 w-12 mx-auto opacity-20" />
                <div>
                  <p className="font-medium">Start a conversation about your data</p>
                  <p className="text-sm mt-2">Example questions:</p>
                </div>
                <Alert className="text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <div>• "Show me all records where status is Open"</div>
                    <div>• "Describe the dataset"</div>
                    <div>• "Count records by region"</div>
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              conversationHistory.map((item) => (
                <ConversationItem key={item.id} item={item} />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="flex gap-2 pt-4 border-t">
          <Input
            placeholder="Ask a question about your data..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAsk()}
            disabled={isAsking}
          />
          <Button onClick={handleAsk} disabled={isAsking || !question.trim()}>
            {isAsking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component for rendering individual conversation items
function ConversationItem({ item }: { item: any }) {
  const response: AskResponse = item.response;

  return (
    <div className="space-y-3">
      {/* User question */}
      <div className="bg-primary/10 rounded-lg p-3">
        <div className="text-xs font-medium mb-1 text-muted-foreground">You asked:</div>
        <div className="text-sm">{item.question}</div>
      </div>

      {/* AI response */}
      <div className="border rounded-lg p-3 space-y-3">
        {response.error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {response.error}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Intent badge */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Badge variant={response.intent === "describe" ? "secondary" : "default"}>
                {response.intent} {response.mode && `(${response.mode})`}
              </Badge>
              {response.planner_text && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      View Plan <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                      {response.planner_text}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>

            {/* Narrative text */}
            {response.text && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-sm">{response.text}</p>
              </div>
            )}

            {/* Data table */}
            {response.rows && response.rows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Showing {response.rows.length} of {response.total?.toLocaleString()} rows
                  </span>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {response.used_fields?.map((field) => (
                            <TableHead key={field} className="whitespace-nowrap">{field}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {response.rows.map((row, idx) => (
                          <TableRow key={idx}>
                            {response.used_fields?.map((field) => (
                              <TableCell key={field} className="text-xs">
                                {row[field] !== null && row[field] !== undefined
                                  ? String(row[field])
                                  : "—"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* Applied filters */}
            {response.applied_filters && Object.keys(response.applied_filters).length > 0 && (
              <div className="text-xs space-y-1">
                <span className="text-muted-foreground font-medium">Applied Filters:</span>
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
            {response.used_fields && response.used_fields.length > 0 && !response.rows && (
              <div className="text-xs">
                <span className="text-muted-foreground">Fields:</span>{" "}
                {response.used_fields.map((field, idx) => (
                  <Badge key={field} variant="outline" className="text-xs mr-1">
                    {field}
                  </Badge>
                ))}
              </div>
            )}

            {/* Context cards */}
            {response.context && response.context.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full">
                    <ChevronDown className="h-3 w-3 mr-2" />
                    View RAG Context ({response.context.length} card{response.context.length !== 1 ? 's' : ''})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {response.context.map((card, idx) => (
                    <div key={idx} className="text-xs p-2 bg-muted/30 rounded border">
                      <div className="font-medium">{card.metadata.column_name}</div>
                      <div className="text-muted-foreground mt-1">{card.text}</div>
                      {card.score && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {(card.score * 100).toFixed(1)}% match
                        </Badge>
                      )}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </>
        )}
      </div>
    </div>
  );
}
