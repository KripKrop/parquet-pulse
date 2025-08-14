import { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { request, getApiConfig } from "@/services/apiClient";
import { useJobStatus } from "@/hooks/useJobStatus";
import type { JobStatus } from "@/types/api";

export interface UploadState {
  file: File | null;
  jobId: string | null;
  isUploading: boolean;
  uploadProgress: number;
  status: JobStatus | null;
  progress: any;
  isComplete: boolean;
  isFailed: boolean;
}

export interface UploadContextValue extends UploadState {
  startUpload: (file: File) => Promise<void>;
  clearUpload: () => void;
  setFile: (file: File | null) => void;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { status, progress, isComplete, isFailed } = useJobStatus(jobId || undefined);
  
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
          icon: '/lovable-uploads/d56d44f0-f9b4-4c29-9b2a-588bb9c9b5d0.png',
          badge: '/lovable-uploads/d56d44f0-f9b4-4c29-9b2a-588bb9c9b5d0.png',
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

  // Handle completion/failure
  useEffect(() => {
    if (isComplete && jobId) {
      toast({ title: "Ingestion complete" });
      
      showBrowserNotification(
        'Upload Complete ✅',
        `Your file "${file?.name || 'upload'}" has been successfully processed.`,
        true
      );
      
      setTimeout(() => {
        playNotificationSound();
      }, 100);
      
      // Clear upload state
      setJobId(null);
      setFile(null);
      setIsUploading(false);
      setUploadProgress(0);
    }
    
    if (isFailed && status?.error) {
      toast({ title: "Ingestion failed", description: status.error, variant: "destructive" });
      
      showBrowserNotification(
        'Upload Failed ❌',
        `Processing failed: ${status.error}`,
        false
      );
      
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [isComplete, isFailed, status?.error, jobId, file?.name]);

  const startUpload = useCallback(async (uploadFile: File) => {
    if (isUploading) return;
    
    setFile(uploadFile);
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<{ job_id: string; skipped?: boolean }>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
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
        setFile(null);
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
      
      setJobId(res.job_id);
      toast({ title: "Upload completed", description: "Processing started..." });
      setUploadProgress(100);
      
    } catch (e: any) {
      toast({ title: "Upload failed", description: String(e.message || e), variant: "destructive" });
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [isUploading]);

  const clearUpload = useCallback(() => {
    setFile(null);
    setJobId(null);
    setIsUploading(false);
    setUploadProgress(0);
  }, []);

  const value: UploadContextValue = {
    file,
    jobId,
    isUploading,
    uploadProgress,
    status,
    progress,
    isComplete,
    isFailed,
    startUpload,
    clearUpload,
    setFile
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