import { createContext, useContext, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { request } from "@/services/apiClient";
import { getAccessToken } from "@/services/tokenManager";

export interface DownloadJob {
  id: string;
  filename: string;
  filters: Record<string, string[]>;
  fields?: string[];
  status: 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalRows: number;
  error?: string;
  controller?: AbortController;
}

export interface DownloadContextValue {
  downloads: DownloadJob[];
  startDownload: (filters: Record<string, string[]>, fields?: string[]) => void;
  cancelDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
}

const DownloadContext = createContext<DownloadContextValue | undefined>(undefined);

function toCsvValue(v: any) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/\"/g, '""') + '"';
  return s;
}

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadJob[]>([]);

  const startDownload = useCallback(async (filters: Record<string, string[]>, fields?: string[]) => {
    const id = `download-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
    const filename = `export-${timestamp}.csv`;

    const controller = new AbortController();
    
    const newDownload: DownloadJob = {
      id,
      filename,
      filters,
      fields,
      status: 'downloading',
      progress: 0,
      totalRows: 0,
      controller
    };

    setDownloads(prev => [...prev, newDownload]);

    try {
      const token = getAccessToken();
      const requestHeaders: HeadersInit = {
        "Content-Type": "application/json"
      };
      
      if (token) {
        requestHeaders["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("https://demoapi.crunchy.sigmoidsolutions.io/stream", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify({ filters, fields }),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access denied - you don't have permission to download this data");
        }
        if (res.status === 404) {
          throw new Error("Resource not found or access denied");
        }
        throw new Error(`Download failed: ${res.status} ${res.statusText}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let { value, done } = await reader.read();
      let buf = "";
      let csvHeaders: string[] | null = fields ? [...fields] : null;
      const chunks: string[] = [];
      let rowCount = 0;
      let lastProgressUpdate = Date.now();

      while (!done) {
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (!line.trim()) continue;
          
          try {
            const obj = JSON.parse(line);
            if (!csvHeaders) csvHeaders = Object.keys(obj);
            if (chunks.length === 0) {
              chunks.push(csvHeaders.join(",") + "\n");
            }
            const row = csvHeaders.map((h) => toCsvValue(obj[h])).join(",") + "\n";
            chunks.push(row);
            rowCount++;
            
            // Update progress periodically (every 500ms)
            const now = Date.now();
            if (now - lastProgressUpdate > 500) {
              setDownloads(prev => prev.map(d => 
                d.id === id ? { ...d, totalRows: rowCount, progress: 50 } : d
              ));
              lastProgressUpdate = now;
            }
          } catch (parseError) {
            console.error("Failed to parse JSON line:", parseError, line);
            // Continue processing other lines
            continue;
          }
        }
        ({ value, done } = await reader.read());
      }

      // flush remainder
      if (buf.trim()) {
        try {
          const obj = JSON.parse(buf);
          if (!csvHeaders) csvHeaders = Object.keys(obj);
          if (chunks.length === 0) chunks.push(csvHeaders.join(",") + "\n");
          const row = csvHeaders.map((h) => toCsvValue(obj[h])).join(",") + "\n";
          chunks.push(row);
          rowCount++;
        } catch (parseError) {
          console.error("Failed to parse final JSON:", parseError);
        }
      }

      // Create and download the file
      const blob = new Blob(chunks, { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDownloads(prev => prev.map(d => 
        d.id === id ? { ...d, status: 'completed', progress: 100, totalRows: rowCount } : d
      ));

      toast({ 
        title: "Download complete", 
        description: `${rowCount.toLocaleString()} rows exported to ${filename}` 
      });

    } catch (error: any) {
      if (controller.signal.aborted) {
        setDownloads(prev => prev.map(d => 
          d.id === id ? { ...d, status: 'cancelled' } : d
        ));
        toast({ title: "Download cancelled" });
      } else {
        const errorMessage = error.message || String(error);
        setDownloads(prev => prev.map(d => 
          d.id === id ? { ...d, status: 'failed', error: errorMessage } : d
        ));
        toast({ 
          title: "Download failed", 
          description: errorMessage, 
          variant: "destructive" 
        });
        console.error("Download error:", error);
      }
    }
  }, []);

  const cancelDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(d => {
      if (d.id === id && d.status === 'downloading') {
        d.controller?.abort();
        return { ...d, status: 'cancelled' as const };
      }
      return d;
    }));
  }, []);

  const removeDownload = useCallback((id: string) => {
    setDownloads(prev => {
      const download = prev.find(d => d.id === id);
      if (download?.status === 'downloading') {
        download.controller?.abort();
      }
      return prev.filter(d => d.id !== id);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads(prev => prev.filter(d => d.status === 'downloading'));
  }, []);

  const value: DownloadContextValue = {
    downloads,
    startDownload,
    cancelDownload,
    removeDownload,
    clearCompleted
  };

  return <DownloadContext.Provider value={value}>{children}</DownloadContext.Provider>;
};

export function useDownload() {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error("useDownload must be used within DownloadProvider");
  }
  return context;
}