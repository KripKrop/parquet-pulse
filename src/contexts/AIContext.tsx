import { createContext, useContext, useState, ReactNode } from "react";
import type { RAGReindexResponse, AskResponse } from "@/types/api";

export interface ConversationItem {
  id: string;
  question: string;
  response: AskResponse;
  timestamp: Date;
}

export interface SavedQuery {
  id: string;
  name: string;
  question: string;
  timestamp: Date;
}

interface AIContextType {
  indexStatus: RAGReindexResponse | null;
  setIndexStatus: (status: RAGReindexResponse | null) => void;
  isIndexing: boolean;
  setIsIndexing: (value: boolean) => void;
  conversationHistory: ConversationItem[];
  addToHistory: (question: string, response: AskResponse) => void;
  clearHistory: () => void;
  suggestedQuery: string | null;
  setSuggestedQuery: (query: string | null) => void;
  lastIndexedFiles: string[];
  setLastIndexedFiles: (files: string[]) => void;
  savedQueries: SavedQuery[];
  addSavedQuery: (query: SavedQuery) => void;
  removeSavedQuery: (id: string) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider = ({ children }: { children: ReactNode }) => {
  const [indexStatus, setIndexStatus] = useState<RAGReindexResponse | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationItem[]>([]);
  const [suggestedQuery, setSuggestedQuery] = useState<string | null>(null);
  const [lastIndexedFiles, setLastIndexedFiles] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  const addToHistory = (question: string, response: AskResponse) => {
    setConversationHistory((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question,
        response,
        timestamp: new Date(),
      },
    ]);
  };

  const clearHistory = () => {
    setConversationHistory([]);
  };

  const addSavedQuery = (query: SavedQuery) => {
    setSavedQueries((prev) => [...prev, query]);
  };

  const removeSavedQuery = (id: string) => {
    setSavedQueries((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <AIContext.Provider
      value={{
        indexStatus,
        setIndexStatus,
        isIndexing,
        setIsIndexing,
        conversationHistory,
        addToHistory,
        clearHistory,
        suggestedQuery,
        setSuggestedQuery,
        lastIndexedFiles,
        setLastIndexedFiles,
        savedQueries,
        addSavedQuery,
        removeSavedQuery,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within AIProvider");
  }
  return context;
};
