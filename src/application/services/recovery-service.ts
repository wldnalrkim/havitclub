import { RecoveryError, type Recovery } from "@/domain/recovery/recovery";
import type { DailyCommitment } from "@/domain/daily-commitment/daily-commitment";
import type { RecoveryRepository } from "@/repositories/interfaces/recovery-repository";

function sourceKey(planId: string, taskId: string) {
  return `${planId}:${taskId}`;
}

export class RecoveryService {
  constructor(private readonly repository: RecoveryRepository) {}

  async list(studentId: string, status?: "pending" | "completed") {
    return this.repository.findByStudent(studentId, status);
  }

  async findPending(studentId: string, recoveryId: string) {
    const recovery = await this.repository.findById(studentId, recoveryId);
    if (!recovery) throw new RecoveryError("NOT_FOUND");
    if (recovery.recoveryStatus === "completed") {
      throw new RecoveryError("ALREADY_COMPLETED");
    }
    return recovery;
  }

  async markCarried(
    studentId: string,
    recoveryId: string,
    carriedDate: string,
    carriedTaskId: string,
    updatedAt: string,
  ) {
    await this.findPending(studentId, recoveryId);
    return this.repository.markCarried(
      studentId,
      recoveryId,
      carriedDate,
      carriedTaskId,
      updatedAt,
    );
  }

  async syncFromCheckouts(
    studentId: string,
    commitments: DailyCommitment[],
    timestamp: string,
  ): Promise<Recovery[]> {
    const recoveries = await this.repository.findByStudent(studentId);
    const bySource = new Map(
      recoveries.map((recovery) => [
        sourceKey(recovery.originalPlanId, recovery.originalTaskId),
        recovery,
      ]),
    );
    const byId = new Map(recoveries.map((recovery) => [recovery.id, recovery]));

    for (const commitment of commitments) {
      if (!commitment.checkout) continue;
      const tasks = new Map(commitment.tasks.map((task) => [task.id, task]));
      for (const result of commitment.checkout.results) {
        const task = tasks.get(result.taskId);
        if (!task) continue;

        if (task.recoveryId) {
          const carried = byId.get(task.recoveryId);
          if (
            result.status === "completed" &&
            carried?.recoveryStatus === "pending"
          ) {
            const completed = await this.repository.complete(
              studentId,
              carried.id,
              timestamp,
            );
            byId.set(completed.id, completed);
          }
          continue;
        }

        if (result.status === "completed") continue;
        const key = sourceKey(commitment.id, task.id);
        if (bySource.has(key)) continue;
        const created = await this.repository.create({
          studentId,
          commitmentId: commitment.id,
          task,
          originalDate: commitment.date,
          status: result.status,
          reason: result.reason,
          createdAt: timestamp,
        });
        bySource.set(key, created);
        byId.set(created.id, created);
      }
    }

    return [...byId.values()].sort((a, b) =>
      a.originalDate === b.originalDate
        ? a.createdAt.localeCompare(b.createdAt)
        : a.originalDate.localeCompare(b.originalDate),
    );
  }
}
