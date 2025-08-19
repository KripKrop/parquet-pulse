import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { request, getApiConfig } from "@/services/apiClient";
import { useUploadRetry } from "@/hooks/useUploadRetry";
import type { JobStatus } from "@/types/api";
import type { UploadFile, UploadConfig, UploadStats, UploadValidationResult } from "@/types/upload";
import { validateFileList, DEFAULT_UPLOAD_CONFIG, generateFileId, calculateETA, formatTimeRemaining } from "@/utils/uploadValidation";

export interface UploadState {
  files: UploadFile[];
  activeUploads: Set<string>;
  isUploading: boolean;
  overallProgress: number;
  config: UploadConfig;
  stats: UploadStats;
}

export interface UploadContextValue extends UploadState {
  startUploads: (files: File[]) => Promise<UploadValidationResult>;
  cancelUpload: (fileId: string) => void;
  cancelAllUploads: () => void;
  retryUpload: (fileId: string) => Promise<void>;
  retryFailedUploads: () => Promise<void>;
  clearUploads: () => void;
  setFiles: (files: File[]) => UploadValidationResult;
  removeFile: (fileId: string) => void;
  updateConfig: (newConfig: Partial<UploadConfig>) => void;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFilesState] = useState<UploadFile[]>([]);
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [config, setConfig] = useState<UploadConfig>(DEFAULT_UPLOAD_CONFIG);
  
  const { getRetryDelay, shouldRetry, categorizeError } = useUploadRetry();
  
  // Calculate stats
  const stats: UploadStats = {
    totalFiles: files.length,
    completedFiles: files.filter(f => f.isComplete).length,
    failedFiles: files.filter(f => f.isFailed && !f.isCancelled).length,
    cancelledFiles: files.filter(f => f.isCancelled).length,
    totalSize: files.reduce((sum, f) => sum + f.file.size, 0),
    uploadedSize: files.reduce((sum, f) => sum + (f.file.size * f.uploadProgress / 100), 0),
    averageSpeed: files.filter(f => f.uploadSpeed > 0).reduce((sum, f) => sum + f.uploadSpeed, 0) / Math.max(1, files.filter(f => f.uploadSpeed > 0).length),
    estimatedTimeRemaining: 0 // Will be calculated below
  };
  
  // Refs for cleanup and audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  
  // Request notification permission and preload audio
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }

    try {
      audioRef.current = new Audio('/sounds/upload-complete.mp3');
      audioRef.current.volume = 0.4;
      audioRef.current.preload = 'auto';
    } catch (error) {
      console.error('Error creating audio element:', error);
    }
  }, []);

  // Calculate ETA for stats
  useEffect(() => {
    const remainingSize = stats.totalSize - stats.uploadedSize;
    if (stats.averageSpeed > 0 && remainingSize > 0) {
      stats.estimatedTimeRemaining = remainingSize / stats.averageSpeed;
    }
  }, [stats.uploadedSize, stats.totalSize, stats.averageSpeed]);

  // Generate and play notification sound
  const playNotificationSound = async () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const createTone = (frequency: number, duration: number, startTime: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration);
        
        oscillator.start(audioContext.currentTime + startTime);
        oscillator.stop(audioContext.currentTime + startTime + duration);
      };
      
      createTone(800, 0.2, 0);
      createTone(600, 0.3, 0.15);
      
    } catch (error) {
      try {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          await audioRef.current.play();
        }
      } catch (fallbackError) {
        console.error('All audio methods failed:', fallbackError);
      }
    }
  };

  // Show browser notification
  const showBrowserNotification = (title: string, body: string, isSuccess = true) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          tag: 'upload-status',
          requireInteraction: false,
          silent: false
        });

        setTimeout(() => {
          notification.close();
        }, 5000);
      } catch (error) {
        console.error('Failed to create notification:', error);
      }
    }
  };

  // Job status polling for all files with job IDs
  useEffect(() => {
    const filesWithJobs = files.filter(f => f.jobId && !f.isComplete && !f.isFailed && !f.isCancelled);
    if (filesWithJobs.length === 0) return;

    let isActive = true;
    
    const pollJobStatuses = async () => {
      if (!isActive) return;
      
      try {
        const statusPromises = filesWithJobs.map(async (file) => {
          try {
            const status = await request<JobStatus>(`/status/${file.jobId}`);
            return { fileId: file.id, status, file };
          } catch (error) {
            return { fileId: file.id, status: null, file, error };
          }
        });
        
        const results = await Promise.allSettled(statusPromises);
        
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.status) {
            const { fileId, status, file } = result.value;
            const progress = Math.round(((status.progress ?? 0) * 100 + Number.EPSILON) * 100) / 100;
            const isComplete = status.status === "completed";
            const isFailed = status.status === "failed";
            
            setFilesState(prev => prev.map(f => 
              f.id === fileId 
                ? { 
                    ...f, 
                    jobStatus: status,
                    processingProgress: progress,
                    isComplete,
                    isFailed: isFailed && !f.isCancelled,
                    status: isComplete ? "completed" : isFailed ? "failed" : "processing",
                    endTime: (isComplete || isFailed) ? Date.now() : f.endTime
                  }
                : f
            ));

            // Handle completion
            if (isComplete && !file.isComplete) {
              toast({ title: "File processed", description: `${file.file.name} completed` });
              
              showBrowserNotification(
                'File Complete ✅',
                `Your file "${file.file.name}" has been successfully processed.`,
                true
              );
              
              setTimeout(() => {
                playNotificationSound();
              }, 100);
            }

            // Handle failure
            if (isFailed && status.error && !file.isFailed && !file.isCancelled) {
              const error = categorizeError({ message: status.error, status: 500 });
              
              setFilesState(prev => prev.map(f => 
                f.id === fileId 
                  ? { ...f, error, isFailed: true, endTime: Date.now() }
                  : f
              ));

              toast({ 
                title: "File failed", 
                description: `${file.file.name}: ${error.message}`, 
                variant: "destructive" 
              });
              
              showBrowserNotification(
                'Upload Failed ❌',
                `Processing failed: ${error.message}`,
                false
              );
            }
          }
        });
      } catch (error) {
        console.error('Error polling job statuses:', error);
      }
      
      // Continue polling if there are still active jobs
      if (isActive) {
        setTimeout(pollJobStatuses, 1000);
      }
    };

    // Start polling
    const timeoutId = setTimeout(pollJobStatuses, 1000);
    
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [files, categorizeError]);

  // Check if all uploads are complete
  useEffect(() => {
    const hasActiveUploads = activeUploads.size > 0;
    const hasIncompleteFiles = files.some(f => 
      f.status === "pending" || 
      f.status === "uploading" || 
      f.status === "processing" || 
      f.status === "validating" || 
      f.status === "retrying"
    );
    
    if (isUploading && !hasActiveUploads && !hasIncompleteFiles && files.length > 0) {
      setIsUploading(false);
      
      const completedCount = files.filter(f => f.isComplete).length;
      const failedCount = files.filter(f => f.isFailed && !f.isCancelled).length;
      
      if (completedCount > 0) {
        toast({ 
          title: "Uploads complete!", 
          description: `${completedCount} files processed successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}` 
        });
        
        // Trigger completion event
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('uploadsComplete'));
        }, 100);
      }
    }
  }, [activeUploads.size, files, isUploading]);

  // Calculate overall progress
  useEffect(() => {
    if (files.length === 0) {
      setOverallProgress(0);
      return;
    }
    
    const totalProgress = files.reduce((sum, file) => {
      if (file.isComplete) return sum + 100;
      if (file.isFailed || file.isCancelled) return sum + 0;
      
      // Weight upload and processing phases
      const uploadWeight = 0.3; // 30% for upload
      const processWeight = 0.7; // 70% for processing
      
      return sum + (file.uploadProgress * uploadWeight) + (file.processingProgress * processWeight);
    }, 0);
    
    setOverallProgress(Math.min(totalProgress / files.length, 100));
  }, [files]);

  const uploadSingleFile = useCallback(async (uploadFile: UploadFile): Promise<void> => {
    const startTime = Date.now();
    let lastProgressTime = startTime;
    let lastProgressBytes = 0;
    
    try {
      // Set initial state
      setFilesState(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              status: "uploading", 
              startTime, 
              error: null,
              uploadSpeed: 0,
              eta: null
            }
          : f
      ));

      const fd = new FormData();
      fd.append("file", uploadFile.file);
      
      const abortController = new AbortController();
      abortControllers.current.set(uploadFile.id, abortController);
      
      const xhr = new XMLHttpRequest();
      
      // Handle abort
      abortController.signal.addEventListener('abort', () => {
        xhr.abort();
      });
      
      const uploadPromise = new Promise<{ job_id: string; skipped?: boolean }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const now = Date.now();
            const percentComplete = (e.loaded / e.total) * 100;
            
            // Calculate upload speed with smoothing for large files
            let speed = 0;
            const timeDiff = now - lastProgressTime;
            if (timeDiff > 500) { // Update speed more frequently for better UX
              const bytesDiff = e.loaded - lastProgressBytes;
              const currentSpeed = bytesDiff / (timeDiff / 1000); // bytes per second
              
              // Smooth speed calculation for better UX
              const previousSpeed = uploadFile.uploadSpeed || 0;
              speed = previousSpeed > 0 ? (previousSpeed * 0.7 + currentSpeed * 0.3) : currentSpeed;
              
              lastProgressTime = now;
              lastProgressBytes = e.loaded;
            }
            
            // Calculate ETA
            const eta = calculateETA(e.loaded, e.total, speed);
            
            setFilesState(prev => prev.map(f => 
              f.id === uploadFile.id 
                ? { 
                    ...f, 
                    uploadProgress: percentComplete,
                    uploadSpeed: speed > 0 ? speed : f.uploadSpeed,
                    eta
                  }
                : f
            ));
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid JSON response'));
            }
          } else {
            reject({ message: `Upload failed: ${xhr.status}`, status: xhr.status });
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
        
        // Set timeout
        setTimeout(() => {
          if (xhr.readyState !== XMLHttpRequest.DONE) {
            xhr.abort();
            reject(new Error('Upload timeout'));
          }
        }, config.requestTimeout);
        
        const { baseUrl, apiKey } = getApiConfig();
        const uploadUrl = `${baseUrl.replace(/\/$/, '')}/upload`;
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('x-api-key', apiKey);
        xhr.send(fd);
      });
      
      const res = await uploadPromise;
      
      // Clean up abort controller
      abortControllers.current.delete(uploadFile.id);
      setActiveUploads(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadFile.id);
        return newSet;
      });
      
      if (res.skipped) {
        setFilesState(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: "completed",
                isComplete: true, 
                uploadProgress: 100,
                endTime: Date.now()
              }
            : f
        ));
        toast({ title: "Already processed", description: uploadFile.file.name });
        return;
      }
      
      setFilesState(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              jobId: res.job_id, 
              status: "processing",
              uploadProgress: 100
            }
          : f
      ));
      
      toast({ title: "Upload completed", description: `${uploadFile.file.name} - Processing started...` });
      
    } catch (e: any) {
      // Clean up
      abortControllers.current.delete(uploadFile.id);
      setActiveUploads(prev => {
        const newSet = new Set(prev);
        newSet.delete(uploadFile.id);
        return newSet;
      });
      
      const error = categorizeError(e);
      
      setFilesState(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { 
              ...f, 
              error,
              isFailed: true,
              status: "failed",
              endTime: Date.now()
            }
          : f
      ));
      
      // Only show toast if not cancelled
      if (!e.message?.includes('cancelled') && !e.message?.includes('abort')) {
        toast({ 
          title: "Upload failed", 
          description: `${uploadFile.file.name}: ${error.message}`, 
          variant: "destructive" 
        });
      }
    }
  }, [config.requestTimeout, categorizeError]);

  const startUploads = useCallback(async (uploadFiles: File[]): Promise<UploadValidationResult> => {
    const validation = validateFileList(uploadFiles, config);
    
    if (!validation.isValid) {
      // Show validation errors
      validation.errors.forEach(error => {
        toast({ title: "Validation Error", description: error, variant: "destructive" });
      });
      return validation;
    }
    
    // Show warnings
    validation.warnings.forEach(warning => {
      toast({ title: "Warning", description: warning, variant: "default" });
    });
    
    if (isUploading) {
      toast({ title: "Upload in progress", description: "Please wait for current uploads to complete", variant: "destructive" });
      return validation;
    }
    
    // Initialize files array
    const initialFiles: UploadFile[] = uploadFiles.map(file => ({
      id: generateFileId(),
      file,
      jobId: null,
      status: "pending",
      uploadProgress: 0,
      processingProgress: 0,
      isComplete: false,
      isFailed: false,
      isCancelled: false,
      error: null,
      retryCount: 0,
      maxRetries: config.maxRetries,
      startTime: null,
      endTime: null,
      uploadSpeed: 0,
      eta: null,
      jobStatus: null
    }));
    
    setFilesState(initialFiles);
    setIsUploading(true);
    setOverallProgress(0);
    
    // Start concurrent uploads (limited by maxConcurrentUploads)
    const uploadQueue = [...initialFiles];
    const activeUploadsSet = new Set<string>();
    
    const processNextUpload = async () => {
      if (uploadQueue.length === 0 || activeUploadsSet.size >= config.maxConcurrentUploads) {
        return;
      }
      
      const nextFile = uploadQueue.shift();
      if (!nextFile) return;
      
      activeUploadsSet.add(nextFile.id);
      setActiveUploads(new Set(activeUploadsSet));
      
      try {
        await uploadSingleFile(nextFile);
      } finally {
        activeUploadsSet.delete(nextFile.id);
        setActiveUploads(new Set(activeUploadsSet));
        
        // Start next upload
        if (uploadQueue.length > 0) {
          processNextUpload();
        }
      }
    };
    
    // Start initial concurrent uploads
    const initialConcurrency = Math.min(config.maxConcurrentUploads, initialFiles.length);
    for (let i = 0; i < initialConcurrency; i++) {
      processNextUpload();
    }
    
    return validation;
  }, [isUploading, uploadSingleFile, config]);

  const cancelUpload = useCallback((fileId: string) => {
    const abortController = abortControllers.current.get(fileId);
    if (abortController) {
      abortController.abort();
      abortControllers.current.delete(fileId);
    }
    
    setFilesState(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, isCancelled: true, status: "cancelled", endTime: Date.now() }
        : f
    ));
    
    setActiveUploads(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileId);
      return newSet;
    });
  }, []);

  const cancelAllUploads = useCallback(() => {
    // Cancel all active uploads
    Array.from(abortControllers.current.keys()).forEach(fileId => {
      cancelUpload(fileId);
    });
    
    setIsUploading(false);
  }, [cancelUpload]);

  const retryUpload = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || file.retryCount >= file.maxRetries) return;
    
    const delay = getRetryDelay(file.retryCount, config.retryDelay);
    
    // Update retry count and reset state
    setFilesState(prev => prev.map(f => 
      f.id === fileId 
        ? { 
            ...f, 
            retryCount: f.retryCount + 1,
            status: "retrying",
            error: null,
            isFailed: false,
            uploadProgress: 0,
            processingProgress: 0
          }
        : f
    ));
    
    // Wait for retry delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Add back to active uploads
    setActiveUploads(prev => new Set([...prev, fileId]));
    
    await uploadSingleFile(file);
  }, [files, getRetryDelay, config.retryDelay, uploadSingleFile]);

  const retryFailedUploads = useCallback(async () => {
    const failedFiles = files.filter(f => f.isFailed && !f.isCancelled && f.retryCount < f.maxRetries);
    
    for (const file of failedFiles) {
      if (activeUploads.size < config.maxConcurrentUploads) {
        await retryUpload(file.id);
      }
    }
  }, [files, activeUploads.size, config.maxConcurrentUploads, retryUpload]);

  const clearUploads = useCallback(() => {
    // Cancel all active uploads first
    cancelAllUploads();
    
    // Clear state
    setFilesState([]);
    setIsUploading(false);
    setOverallProgress(0);
    setActiveUploads(new Set());
  }, [cancelAllUploads]);

  const setFiles = useCallback((newFiles: File[]): UploadValidationResult => {
    const validation = validateFileList(newFiles, config);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast({ title: "Validation Error", description: error, variant: "destructive" });
      });
      return validation;
    }
    
    // Show warnings
    validation.warnings.forEach(warning => {
      toast({ title: "Warning", description: warning });
    });
    
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: generateFileId(),
      file,
      jobId: null,
      status: "pending",
      uploadProgress: 0,
      processingProgress: 0,
      isComplete: false,
      isFailed: false,
      isCancelled: false,
      error: null,
      retryCount: 0,
      maxRetries: config.maxRetries,
      startTime: null,
      endTime: null,
      uploadSpeed: 0,
      eta: null,
      jobStatus: null
    }));
    
    setFilesState(uploadFiles);
    return validation;
  }, [config]);

  const removeFile = useCallback((fileId: string) => {
    // Cancel upload if active
    cancelUpload(fileId);
    
    // Remove from files
    setFilesState(prev => prev.filter(f => f.id !== fileId));
  }, [cancelUpload]);

  const updateConfig = useCallback((newConfig: Partial<UploadConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const value: UploadContextValue = {
    files,
    activeUploads,
    isUploading,
    overallProgress,
    config,
    stats,
    startUploads,
    cancelUpload,
    cancelAllUploads,
    retryUpload,
    retryFailedUploads,
    clearUploads,
    setFiles,
    removeFile,
    updateConfig
  };

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
};

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within UploadProvider");
  }
  return context;
}