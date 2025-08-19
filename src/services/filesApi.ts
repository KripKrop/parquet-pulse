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
  return request<FileDetailsResponse>(`/files/${encodeURIComponent(fileId)}`);
}

export async function deleteFileDryRun(fileId: string): Promise<FileDryRunResponse> {
  return request<FileDryRunResponse>(`/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    body: JSON.stringify({ dry_run: true })
  });
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

  return request<FileDeleteResponse>(`/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    body: JSON.stringify(body)
  });
}