import type { Recovery, Task, TaskStatus } from "@/lib/mock-data";
import {
  getMockState,
  saveMockState,
} from "@/mock/mock-storage";
import { mockStudent, type MockState } from "@/mock/initial-mock-state";

function updateState(update: (state: MockState) => MockState) {
  const nextState = update(getMockState());
  saveMockState(nextState);
  return nextState;
}

export function getMockStudentState() {
  return getMockState();
}

export function getMockStudent() {
  return mockStudent;
}

export function saveMockTodayPlan(plannedCheckOutTime: string, tasks: Task[]) {
  return updateState((state) => ({
    ...state,
    todayPlan: {
      plannedCheckOutTime,
      tasks,
      status: "submitted",
    },
  }));
}

export function submitMockCheckout(
  tasks: Task[],
  statuses: Record<string, TaskStatus>,
  incompleteReasons: Record<string, string>,
) {
  const recoveryTasks = tasks.filter((task) => {
    const status = statuses[task.id];
    return status === "partial" || status === "incomplete";
  });

  const stateWithCheckout = updateState((state) => ({
    ...state,
    todayPlan: state.todayPlan
      ? {
          ...state.todayPlan,
          tasks: tasks.map((task) => ({
            ...task,
            status: statuses[task.id] ?? task.status,
            incompleteReason: incompleteReasons[task.id] || undefined,
          })),
        }
      : state.todayPlan,
  }));

  if (recoveryTasks.length === 0) return stateWithCheckout;

  const recoveryByTaskId = new Map(
    stateWithCheckout.recoveries.map((recovery) => [recovery.sourceTaskId, recovery]),
  );
  const nextRecoveries: Recovery[] = recoveryTasks.map((task) => {
    const existingRecovery = recoveryByTaskId.get(task.id);
    return {
      sourceTaskId: task.id,
      sourceTaskTitle: task.title,
      sourceTaskStatus: statuses[task.id] as "partial" | "incomplete",
      title: task.title,
      scheduledAt: existingRecovery?.scheduledAt ?? "내일 저녁",
      status: existingRecovery?.status ?? "open",
      incompleteReason: incompleteReasons[task.id],
    };
  });
  const recoveryTaskIds = new Set(recoveryTasks.map((task) => task.id));
  const retainedRecoveries = stateWithCheckout.recoveries.filter(
    (recovery) => !recoveryTaskIds.has(recovery.sourceTaskId),
  );

  return updateState((state) => ({
    ...state,
    recoveries: [...retainedRecoveries, ...nextRecoveries],
  }));
}

export function getMockDashboardData() {
  const state = getMockState();
  const taskCount = state.todayPlan?.tasks.length ?? 0;

  return {
    ...state,
    taskCount,
    hasPlan: Boolean(state.todayPlan),
  };
}
