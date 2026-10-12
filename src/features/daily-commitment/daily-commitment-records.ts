import type { DailyRecord, Task } from "@/lib/mock-data";
import type { DailyCommitmentView } from "./daily-commitment-api";

export function toTasks(commitment: DailyCommitmentView | null): Task[] {
  if (!commitment) return [];
  const results = new Map(
    (commitment.checkout?.results ?? []).map((result) => [result.taskId, result]),
  );
  return commitment.tasks.map((task) => {
    const result = results.get(task.id);
    return {
      id: task.id,
      title: task.description,
      subject: task.subject,
      status: result?.status ?? "pending",
      incompleteReason: result?.reason ?? undefined,
    };
  });
}

export function toDailyRecords(commitments: DailyCommitmentView[]): DailyRecord[] {
  return commitments.map((commitment) => ({
    date: commitment.date,
    plannedCheckOutTime: "",
    tasks: toTasks(commitment),
  }));
}
