import { createContext, useContext, useState, ReactNode } from "react";
import type { RAGReindexResponse, AskResponse } from "@/types/api";

interface ConversationItem {
  id: string;
  question: string;
  response: AskResponse;
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
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider = ({ children }: { children: ReactNode }) => {
  const [indexStatus, setIndexStatus] = useState<RAGReindexResponse | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationItem[]>([]);

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
