import { useCallback } from "react";
import type { UploadError } from "@/types/upload";

export function useUploadRetry() {
  const getRetryDelay = useCallback((retryCount: number, baseDelay: number): number => {
    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }, []);

  const shouldRetry = useCallback((error: UploadError, retryCount: number, maxRetries: number): boolean => {
    if (retryCount >= maxRetries) return false;
    return error.retryable;
  }, []);

  const categorizeError = useCallback((error: any): UploadError => {
    const message = error.message || error.toString();
    
    // Network errors
    if (message.includes('Network') || message.includes('ERR_NETWORK') || message.includes('ERR_INTERNET_DISCONNECTED')) {
      return {
        type: "network",
        message: "Network connection error. Please check your internet connection.",
        retryable: true
      };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('ERR_TIMEOUT')) {
      return {
        type: "timeout", 
        message: "Request timed out. The server may be busy.",
        retryable: true
      };
    }

    // Server errors (5xx)
    if (error.status >= 500 && error.status < 600) {
      return {
        type: "server",
        message: "Server error. Please try again later.",
        code: error.status?.toString(),
        retryable: true
      };
    }

    // Rate limiting (429)
    if (error.status === 429) {
      return {
        type: "rate_limit",
        message: "Too many requests. Please wait before retrying.",
        code: "429",
        retryable: true
      };
    }

    // Unauthorized (401)
    if (error.status === 401) {
      return {
        type: "unauthorized",
        message: "Invalid API key. Please check your settings.",
        code: "401",
        retryable: false
      };
    }

    // File corruption or validation errors (4xx)
    if (error.status >= 400 && error.status < 500) {
      return {
        type: "validation",
        message: message || "File validation error.",
        code: error.status?.toString(),
        retryable: false
      };
    }

    // Resource errors
    if (message.includes('ERR_INSUFFICIENT_RESOURCES')) {
      return {
        type: "server",
        message: "Server resources exhausted. Please try again later.",
        retryable: true
      };
    }

    // Default to network error for unknown issues
    return {
      type: "network",
      message: message || "Unknown error occurred.",
      retryable: true
    };
  }, []);

  return {
    getRetryDelay,
    shouldRetry,
    categorizeError
  };
}