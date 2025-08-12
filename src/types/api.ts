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

export type ColumnsResponse = { columns: string[] };
export type DistinctResponse = { values: string[] };

export type QueryBody = {
  filters: Record<string, string[]>;
  fields?: string[];
  limit?: number;
  offset?: number;
};

export type QueryResponse = { rows: Record<string, any>[]; total: number };
