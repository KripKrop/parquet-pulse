import { request } from "./apiClient";
import type { 
  FilesListResponse, 
  FileDetailsResponse, 
  FileDeleteRequest, 
  FileDryRunResponse, 
  FileDeleteResponse 
} from "@/types/api";

export async function listFiles(): Promise<FilesListResponse> {
  return request<FilesListResponse>("/files");
}

export async function getFileDetails(fileId: string): Promise<FileDetailsResponse> {
  try {
    return await request<FileDetailsResponse>(`/files/${encodeURIComponent(fileId)}`);
  } catch (error: any) {
    if (error.status === 404) {
      throw new Error("File not found or access denied");
    }
    throw error;
  }
}

export async function deleteFileDryRun(fileId: string): Promise<FileDryRunResponse> {
  try {
    return await request<FileDryRunResponse>(`/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      body: JSON.stringify({ dry_run: true })
    });
  } catch (error: any) {
    if (error.status === 403) {
      throw new Error("You don't have permission to delete this file");
    }
    if (error.status === 404) {
      throw new Error("File not found or access denied");
    }
    throw error;
  }
}

export async function deleteFileConfirm(
  fileId: string, 
  matched: number, 
  dropRecord = true
): Promise<FileDeleteResponse> {
  const body: FileDeleteRequest = {
    confirm: true,
    expected_min: matched,
    expected_max: matched,
    drop_file_record: dropRecord,
  };

  try {
    return await request<FileDeleteResponse>(`/files/${encodeURIComponent(fileId)}`, {
      method: "DELETE",
      body: JSON.stringify(body)
    });
  } catch (error: any) {
    if (error.status === 403) {
      throw new Error("You don't have permission to delete this file");
    }
    if (error.status === 404) {
      throw new Error("File not found or access denied");
    }
    if (error.status === 409) {
      throw new Error("Data changed since preview - please retry");
    }
    throw error;
  }
}