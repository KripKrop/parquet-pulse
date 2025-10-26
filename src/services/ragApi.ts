import { request } from "./apiClient";
import type {
  RAGReindexRequest,
  RAGReindexResponse,
  RAGSearchRequest,
  RAGSearchResponse,
  AskRequest,
  AskResponse,
} from "@/types/api";

export async function reindexRAG(
  req: RAGReindexRequest
): Promise<RAGReindexResponse> {
  return request<RAGReindexResponse>("/rag/reindex", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function searchRAG(
  req: RAGSearchRequest
): Promise<RAGSearchResponse> {
  return request<RAGSearchResponse>("/rag/search", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function askQuestion(req: AskRequest): Promise<AskResponse> {
  return request<AskResponse>("/ask", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
