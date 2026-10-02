import type { DailyRecord, Recovery, Task, TaskStatus } from "@/lib/mock-data";
import { addDays } from "@/lib/progress";
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

function isRecoveryStatus(status: TaskStatus): status is "partial" | "incomplete" {
  return status === "partial" || status === "incomplete";
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
  return updateState((state) => {
    const today = state.currentDate;
    const checkedTasks = tasks.map((task) => {
      const status = statuses[task.id] ?? task.status;
      return {
        ...task,
        status,
        incompleteReason: isRecoveryStatus(status) ? incompleteReasons[task.id] || undefined : undefined,
      };
    });

    // 오늘 이어서 한 이전 Recovery는 결과에 따라 해결 상태로 바꿉니다.
    const carriedStatusBySourceId = new Map(
      checkedTasks
        .filter((task) => task.recoverySourceTaskId)
        .map((task) => [task.recoverySourceTaskId as string, task.status]),
    );
    const previousRecoveries = state.recoveries
      .filter((recovery) => recovery.sourceDate !== today)
      .map((recovery) => {
        const carriedStatus = carriedStatusBySourceId.get(recovery.sourceTaskId);
        if (!carriedStatus) return recovery;
        return { ...recovery, status: carriedStatus === "completed" ? "completed" as const : "carried_over" as const };
      });

    // 오늘 생성되는 Recovery는 체크아웃을 수정할 때마다 다시 계산해 중복과 누락을 막습니다.
    const existingTodayRecoveries = new Map(
      state.recoveries
        .filter((recovery) => recovery.sourceDate === today)
        .map((recovery) => [recovery.sourceTaskId, recovery]),
    );
    const todayRecoveries: Recovery[] = checkedTasks
      .filter((task) => isRecoveryStatus(task.status))
      .map((task) => ({
        sourceTaskId: task.id,
        sourceTaskTitle: task.title,
        sourceTaskSubject: task.subject,
        sourceTaskStatus: task.status as "partial" | "incomplete",
        sourceDate: today,
        title: task.title,
        scheduledAt: existingTodayRecoveries.get(task.id)?.scheduledAt ?? "다음 계획",
        status: "open",
        incompleteReason: task.incompleteReason,
      }));

    return {
      ...state,
      todayPlan: state.todayPlan ? { ...state.todayPlan, tasks: checkedTasks } : state.todayPlan,
      recoveries: [...previousRecoveries, ...todayRecoveries],
    };
  });
}

// MOCK ONLY: 며칠 동안 사용하는 흐름을 테스트하기 위해 가상 날짜를 하루 넘깁니다.
// Phase 2에서는 서버가 실제 날짜를 결정하므로 제거합니다.
export function advanceMockDay() {
  return updateState((state) => {
    const todayRecord: DailyRecord | null = state.todayPlan
      ? { date: state.currentDate, plannedCheckOutTime: state.todayPlan.plannedCheckOutTime, tasks: state.todayPlan.tasks }
      : null;

    return {
      ...state,
      currentDate: addDays(state.currentDate, 1),
      todayPlan: null,
      history: todayRecord
        ? [...state.history.filter((record) => record.date !== state.currentDate), todayRecord]
        : state.history,
    };
  });
}

export function getMockDashboardData() {
  const state = getMockState();
  const records: DailyRecord[] = state.todayPlan
    ? [...state.history, { date: state.currentDate, plannedCheckOutTime: state.todayPlan.plannedCheckOutTime, tasks: state.todayPlan.tasks }]
    : state.history;

  return {
    currentDate: state.currentDate,
    records,
    recoveries: state.recoveries,
  };
}
