export type UploadErrorType = 
  | "validation" 
  | "network" 
  | "server" 
  | "file_corruption" 
  | "timeout" 
  | "rate_limit" 
  | "unauthorized";

export type UploadStatus = 
  | "pending" 
  | "validating" 
  | "uploading" 
  | "processing" 
  | "completed" 
  | "failed" 
  | "cancelled" 
  | "retrying";

export interface UploadError {
  type: UploadErrorType;
  message: string;
  code?: string;
  retryable: boolean;
}

export interface UploadFile {
  id: string;
  file: File;
  jobId: string | null;
  status: UploadStatus;
  uploadProgress: number;
  processingProgress: number;
  isComplete: boolean;
  isFailed: boolean;
  isCancelled: boolean;
  error: UploadError | null;
  retryCount: number;
  maxRetries: number;
  startTime: number | null;
  endTime: number | null;
  uploadSpeed: number; // bytes per second
  eta: number | null; // estimated time remaining in seconds
  jobStatus: any | null; // JobStatus from API
}

export interface UploadConfig {
  maxFileSize: number; // bytes
  maxTotalSize: number; // bytes  
  maxConcurrentUploads: number;
  allowedTypes: string[];
  retryDelay: number; // base delay in ms
  maxRetries: number;
  chunkSize: number; // for chunked uploads
  requestTimeout: number; // ms
}

export interface UploadValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadStats {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  cancelledFiles: number;
  totalSize: number;
  uploadedSize: number;
  averageSpeed: number;
  estimatedTimeRemaining: number;
}