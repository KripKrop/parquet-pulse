import { createContext, useContext, useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { request } from "@/services/apiClient";

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
      const res = await request<Response>("/stream", {
        method: "POST",
        body: JSON.stringify({ filters, fields }),
        signal: controller.signal,
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let { value, done } = await reader.read();
      let buf = "";
      let headers: string[] | null = fields ? [...fields] : null;
      const chunks: string[] = [];
      let rowCount = 0;

      while (!done) {
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (!line.trim()) continue;
          const obj = JSON.parse(line);
          if (!headers) headers = Object.keys(obj);
          if (chunks.length === 0) {
            chunks.push(headers.join(",") + "\n");
          }
          const row = headers.map((h) => toCsvValue(obj[h])).join(",") + "\n";
          chunks.push(row);
          rowCount++;
          
          setDownloads(prev => prev.map(d => 
            d.id === id ? { ...d, totalRows: rowCount } : d
          ));
        }
        ({ value, done } = await reader.read());
      }

      // flush remainder
      if (buf.trim()) {
        const obj = JSON.parse(buf);
        if (!headers) headers = Object.keys(obj);
        if (chunks.length === 0) chunks.push(headers.join(",") + "\n");
        const row = headers.map((h) => toCsvValue(obj[h])).join(",") + "\n";
        chunks.push(row);
        rowCount++;
      }

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
        description: `${rowCount} rows exported to ${filename}` 
      });

    } catch (error: any) {
      if (controller.signal.aborted) {
        setDownloads(prev => prev.map(d => 
          d.id === id ? { ...d, status: 'cancelled' } : d
        ));
        toast({ title: "Download cancelled" });
      } else {
        setDownloads(prev => prev.map(d => 
          d.id === id ? { ...d, status: 'failed', error: String(error.message || error) } : d
        ));
        toast({ 
          title: "Download failed", 
          description: String(error.message || error), 
          variant: "destructive" 
        });
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