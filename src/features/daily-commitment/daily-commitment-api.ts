import type {
  CheckoutTaskResult,
  DailyCheckout,
  DailyCommitmentRevision,
  DailyCommitmentInput,
  PlannedCheckOut,
  StudyTask,
} from "@/domain/daily-commitment/daily-commitment";
import type { Recovery } from "@/domain/recovery/recovery";

export type DailyCommitmentView = {
  date: string;
  tasks: StudyTask[];
  initialTasks: StudyTask[];
  initialSubmittedAt: string;
  updatedAt: string;
  version: number;
  checkout: DailyCheckout | null;
};

type ApiError = { ok: false; code?: string; message?: string };
type CommitmentResponse = {
  ok: true;
  commitment: DailyCommitmentView | null;
  plannedCheckOut: PlannedCheckOut;
  created?: boolean;
  idempotent?: boolean;
} | ApiError;

export async function getDailyCommitment(date: string) {
  return request<CommitmentResponse>(
    `/api/daily-commitments?date=${encodeURIComponent(date)}`,
  );
}

export async function getDailyCommitmentHistory(from: string, to: string) {
  return request<{ ok: true; commitments: DailyCommitmentView[] } | ApiError>(
    `/api/daily-commitments/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}

export async function saveDailyCommitment(input: DailyCommitmentInput) {
  return request<CommitmentResponse>("/api/daily-commitments", {
    method: input.expectedVersion === undefined ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function saveDailyCheckout(date: string, results: CheckoutTaskResult[]) {
  return request<{ ok: true; commitment: DailyCommitmentView } | ApiError>(
    "/api/daily-commitments/checkout",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, results }),
    },
  );
}

export async function getDailyCommitmentRevisions(date: string) {
  return request<
    { ok: true; revisions: DailyCommitmentRevision[] } | ApiError
  >(`/api/daily-commitments/revisions?date=${encodeURIComponent(date)}`);
}

export async function getPendingRecoveries() {
  return request<{ ok: true; recoveries: Recovery[] } | ApiError>("/api/recoveries?status=pending");
}

export async function getRecoveries(status?: "pending" | "completed") {
  const query = status ? `?status=${status}` : "";
  return request<{ ok: true; count: number; recoveries: Recovery[] } | ApiError>(`/api/recoveries${query}`);
}

async function request<T>(url: string, init?: RequestInit) {
  try {
    const response = await fetch(url, { ...init, cache: "no-store" });
    const data = (await response.json()) as T;
    return { response, data };
  } catch {
    return {
      response: undefined,
      data: { ok: false, code: "NETWORK_ERROR", message: "네트워크 연결을 확인해주세요." } as T,
    };
  }
}
