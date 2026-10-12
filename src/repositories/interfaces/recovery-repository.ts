import type { Recovery, RecoveryInput, RecoveryStatus } from "@/domain/recovery/recovery";

export interface RecoveryRepository {
  findByStudent(
    studentId: string,
    status?: RecoveryStatus,
  ): Promise<Recovery[]>;
  findById(studentId: string, recoveryId: string): Promise<Recovery | null>;
  create(input: RecoveryInput & { studentId: string }): Promise<Recovery>;
  markCarried(
    studentId: string,
    recoveryId: string,
    carriedDate: string,
    carriedTaskId: string,
    updatedAt: string,
  ): Promise<Recovery>;
  complete(
    studentId: string,
    recoveryId: string,
    completedAt: string,
  ): Promise<Recovery>;
}
