export type Algorithm =
  | "sliding-window-log"
  | "sliding-window-counter"
  | "token-bucket"
  | "leaky-bucket";

export interface CheckRequestBody {
  clientId: string;
  algorithm: Algorithm;
  limit: number;
  windowSeconds: number;
}

export interface CheckResponse {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  queuePosition?: number | null;
  estimatedProcessAt?: number | null;
}

export interface ApiErrorResponse {
  error: string;
}

export type CheckResult =
  | { ok: true; status: 200 | 429; data: CheckResponse }
  | { ok: false; status: number | null; error: string };

export interface LogEntry {
  id: string;
  algorithm: Algorithm;
  clientId: string;
  sentAt: number;
  limit: number;
  windowSeconds: number;
  result: CheckResult;
}
