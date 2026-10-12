import type { DailyCommitmentRevision } from "@/domain/daily-commitment/daily-commitment";

export interface DailyCommitmentRevisionRepository {
  findByCommitment(
    studentId: string,
    commitmentId: string,
  ): Promise<DailyCommitmentRevision[]>;
  createMany(
    revisions: Omit<DailyCommitmentRevision, "id">[],
  ): Promise<DailyCommitmentRevision[]>;
}
