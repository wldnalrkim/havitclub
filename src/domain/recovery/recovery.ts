import type { CheckoutTaskStatus, StudyTask } from "@/domain/daily-commitment/daily-commitment";

export type RecoveryStatus = "pending" | "completed";

export type Recovery = {
  id: string;
  studentId: string;
  originalPlanId: string;
  originalTaskId: string;
  originalDate: string;
  subject: string;
  content: string;
  originalCompletionStatus: Exclude<CheckoutTaskStatus, "completed">;
  incompleteReason: string | null;
  recoveryStatus: RecoveryStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  carriedDate: string | null;
  carriedTaskId: string | null;
};

export type RecoveryInput = {
  commitmentId: string;
  task: StudyTask;
  originalDate: string;
  status: Exclude<CheckoutTaskStatus, "completed">;
  reason: string | null;
  createdAt: string;
};

export class RecoveryError extends Error {
  readonly code: "NOT_FOUND" | "ALREADY_COMPLETED" | "INVALID_STATUS";

  constructor(code: RecoveryError["code"]) {
    super(code);
    this.name = "RecoveryError";
    this.code = code;
  }
}
