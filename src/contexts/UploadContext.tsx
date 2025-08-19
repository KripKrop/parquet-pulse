import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { request, getApiConfig } from "@/services/apiClient";
import { useJobStatus } from "@/hooks/useJobStatus";
import type { JobStatus } from "@/types/api";

export interface UploadFile {
  file: File;
  jobId: string | null;
  status: JobStatus | null;
  uploadProgress: number;
  isComplete: boolean;
  isFailed: boolean;
}

export interface UploadState {
  files: UploadFile[];
  currentFileIndex: number;
  isUploading: boolean;
  overallProgress: number;
}

export interface UploadContextValue extends UploadState {
  startUploads: (files: File[]) => Promise<void>;
  clearUploads: () => void;
  setFiles: (files: File[]) => void;
  removeFile: (index: number) => void;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [files, setFilesState] = useState<UploadFile[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  
  const currentFile = files[currentFileIndex];
  const { status, progress, isComplete, isFailed } = useJobStatus(currentFile?.jobId || undefined);
  
  // Audio ref for sound notifications
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  // Update file status when job status changes
  useEffect(() => {
    if (currentFile && status) {
      setFilesState(prev => prev.map((f, i) => 
        i === currentFileIndex 
          ? { ...f, status, isComplete, isFailed }
          : f
      ));
    }
  }, [currentFileIndex, status, isComplete, isFailed, currentFile]);

  // Handle completion/failure and move to next file
  useEffect(() => {
    if (isComplete && currentFile) {
      toast({ title: "File processed", description: `${currentFile.file.name} completed` });
      
      showBrowserNotification(
        'File Complete ✅',
        `Your file "${currentFile.file.name}" has been successfully processed.`,
        true
      );
      
      setTimeout(() => {
        playNotificationSound();
      }, 100);
      
      // Move to next file or finish
      if (currentFileIndex < files.length - 1) {
        setCurrentFileIndex(prev => prev + 1);
      } else {
        // All files complete
        setIsUploading(false);
        toast({ title: "All uploads complete!", description: `Successfully processed ${files.length} files` });
        
        // Add a small delay to ensure state updates are complete before notifying parent
        setTimeout(() => {
          // Trigger a custom event that the parent can listen to
          window.dispatchEvent(new CustomEvent('uploadsComplete'));
        }, 100);
      }
    }
    
    if (isFailed && status?.error && currentFile) {
      toast({ title: "File failed", description: `${currentFile.file.name}: ${status.error}`, variant: "destructive" });
      
      showBrowserNotification(
        'Upload Failed ❌',
        `Processing failed: ${status.error}`,
        false
      );
      
      // Move to next file even if this one failed
      if (currentFileIndex < files.length - 1) {
        setCurrentFileIndex(prev => prev + 1);
      } else {
        setIsUploading(false);
      }
    }
  }, [isComplete, isFailed, status?.error, currentFile, currentFileIndex, files.length]);

  // Calculate overall progress
  useEffect(() => {
    if (files.length === 0) {
      setOverallProgress(0);
      return;
    }
    
    const totalFiles = files.length;
    const completedFiles = files.filter(f => f.isComplete).length;
    const currentProgress = currentFile?.uploadProgress || 0;
    
    const overall = ((completedFiles * 100) + currentProgress) / totalFiles;
    setOverallProgress(Math.min(overall, 100));
  }, [files, currentFile, currentFileIndex]);

  const uploadSingleFile = useCallback(async (uploadFile: File, fileIndex: number): Promise<void> => {
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ job_id: string; skipped?: boolean }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setFilesState(prev => prev.map((f, i) => 
              i === fileIndex 
                ? { ...f, uploadProgress: percentComplete }
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
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });
        
        const { baseUrl, apiKey } = getApiConfig();
        const uploadUrl = `${baseUrl.replace(/\/$/, '')}/upload`;
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('x-api-key', apiKey);
        xhr.send(fd);
      });
      
      const res = await uploadPromise;
      
      if (res.skipped) {
        toast({ title: "Already ingested", description: uploadFile.name });
        setFilesState(prev => prev.map((f, i) => 
          i === fileIndex 
            ? { ...f, isComplete: true, uploadProgress: 100 }
            : f
        ));
        return;
      }
      
      setFilesState(prev => prev.map((f, i) => 
        i === fileIndex 
          ? { ...f, jobId: res.job_id, uploadProgress: 100 }
          : f
      ));
      
      toast({ title: "Upload completed", description: `${uploadFile.name} - Processing started...` });
      
    } catch (e: any) {
      toast({ title: "Upload failed", description: `${uploadFile.name}: ${e.message || e}`, variant: "destructive" });
      setFilesState(prev => prev.map((f, i) => 
        i === fileIndex 
          ? { ...f, isFailed: true }
          : f
      ));
    }
  }, []);

  const startUploads = useCallback(async (uploadFiles: File[]) => {
    if (isUploading || uploadFiles.length === 0) return;
    
    // Initialize files array
    const initialFiles: UploadFile[] = uploadFiles.map(file => ({
      file,
      jobId: null,
      status: null,
      uploadProgress: 0,
      isComplete: false,
      isFailed: false
    }));
    
    setFilesState(initialFiles);
    setCurrentFileIndex(0);
    setIsUploading(true);
    setOverallProgress(0);
    
    // Upload first file
    await uploadSingleFile(uploadFiles[0], 0);
  }, [isUploading, uploadSingleFile]);

  // Auto-upload next file when current completes
  useEffect(() => {
    if (isUploading && currentFile && (currentFile.isComplete || currentFile.isFailed)) {
      const nextIndex = currentFileIndex + 1;
      if (nextIndex < files.length) {
        const nextFile = files[nextIndex];
        if (!nextFile.jobId && !nextFile.isComplete && !nextFile.isFailed) {
          uploadSingleFile(nextFile.file, nextIndex);
        }
      }
    }
  }, [isUploading, currentFile, currentFileIndex, files, uploadSingleFile]);

  const clearUploads = useCallback(() => {
    setFilesState([]);
    setCurrentFileIndex(0);
    setIsUploading(false);
    setOverallProgress(0);
  }, []);

  const setFiles = useCallback((newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      file,
      jobId: null,
      status: null,
      uploadProgress: 0,
      isComplete: false,
      isFailed: false
    }));
    setFilesState(uploadFiles);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFilesState(prev => prev.filter((_, i) => i !== index));
  }, []);

  const value: UploadContextValue = {
    files,
    currentFileIndex,
    isUploading,
    overallProgress,
    startUploads,
    clearUploads,
    setFiles,
    removeFile
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