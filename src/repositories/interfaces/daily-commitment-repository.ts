import type {
  DailyCheckout,
  DailyCommitment,
  DailyCommitmentInput,
  DailyCommitmentSummary,
} from "@/domain/daily-commitment/daily-commitment";

export interface DailyCommitmentRepository {
  findByStudentAndDate(
    studentId: string,
    date: string,
  ): Promise<DailyCommitment | null>;
  findByStudentAndDateRange(
    studentId: string,
    from: string,
    to: string,
  ): Promise<DailyCommitment[]>;
  create(
    studentId: string,
    input: DailyCommitmentInput,
    submittedAt: string,
    summary: DailyCommitmentSummary,
  ): Promise<DailyCommitment>;
  update(
    studentId: string,
    input: DailyCommitmentInput,
    updatedAt: string,
    expectedVersion: number,
    summary: DailyCommitmentSummary,
  ): Promise<DailyCommitment>;
  saveCheckout(
    studentId: string,
    date: string,
    checkout: DailyCheckout,
  ): Promise<DailyCommitment>;
  updateSummary(
    studentId: string,
    date: string,
    summary: DailyCommitmentSummary,
  ): Promise<DailyCommitment>;
}
