export type JobStatus = {
  status: "uploading" | "queued" | "processing" | "completed" | "failed";
  stage?:
    | "uploading"
    | "queued"
    | "reading"
    | "schema_evolved"
    | "counting"
    | "ingesting"
    | "completed"
    | "failed";
  uploaded?: number;
  total?: number | null;
  rows_total?: number;
  rows_processed?: number;
  rows_inserted?: number;
  rows_skipped?: number;
  progress?: number; // 0..1
  error?: string | null;
  file?: string | null;
  started_at?: string;
  ended_at?: string;
};

export type ColumnsResponse = { 
  columns: string[];
  datasetVersion?: string; // From X-Dataset-Version header
};
export type DistinctResponse = { values: string[] };

export type FacetValue = {
  value: string;
  count: number;
};

export type FacetsRequest = {
  filters: Record<string, string[]>;
  fields?: string[];
  exclude_self?: boolean;
  limit?: number;
  include_empty?: boolean;
  order?: "count_desc" | "value_asc" | "value_desc";
  source_files?: string[] | null;
};

export type FacetsResponse = {
  facets: Record<string, FacetValue[]>;
  total: number;
  columns: string[];
};

export type QueryBody = {
  filters: Record<string, string[]>;
  fields?: string[];
  limit?: number;
  offset?: number;
  source_files?: string[] | null;
};

export type QueryResponse = { rows: Record<string, any>[]; total: number };

// Files API Types
export type FilesListResponse = {
  files: Array<{
    file_id: string
    filename: string
    file_hash: string
    uploaded_at: string
    rows_total: number | null
    rows_inserted: number | null
    rows_skipped: number | null
    current_row_count: number
    last_ingested_at: string | null
    size_bytes: number | null
    ext: string | null
    columns_map: Record<string, string>
  }>
}

export type FileDetailsResponse = {
  file_id: string
  filename: string
  file_hash: string
  uploaded_at: string
  rows_total: number | null
  rows_inserted: number | null
  rows_skipped: number | null
  current_row_count: number
  last_ingested_at: string | null
  size_bytes: number | null
  ext: string | null
  columns_map: Record<string, string>
}

export type FileDeleteRequest = {
  dry_run?: boolean
  confirm?: boolean
  drop_file_record?: boolean
  expected_min?: number | null
  expected_max?: number | null
}

export type FileDryRunResponse = {
  file_id: string
  filename: string
  matched: number
  deleted: 0
  dry_run: true
}

export type FileDeleteResponse = {
  file_id: string
  filename: string
  deleted: number
  dropped_columns: string[]
}

// Bulk Delete Types
export type BulkDeleteRequest = {
  row_hashes?: string[]
  filters?: Record<string, string[]>
  source_files?: string[]
  dry_run?: boolean
  confirm?: boolean
  expected_min?: number
  expected_max?: number
  drop_file_records?: boolean
}

export type BulkDeleteResponse = {
  matched: number
  deleted: number
  dry_run: boolean
  dropped_columns?: string[]
}

// Admin Clear Types
export type ClearRequest = {
  scope: "dataset" | "files" | "uploads" | "redis" | "cache" | "all"
  confirm: boolean
  confirm_token?: string
  target_tenant_id?: string
}

export type ClearResponse = {
  ok: boolean
  cleared: string[]
}
