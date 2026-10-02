import {
  getMockDashboardData,
  getMockStudentState,
  saveMockTodayPlan,
  submitMockCheckout,
} from "@/mock/mock-student-service";
import type { Task, TaskStatus } from "@/lib/mock-data";

// Phase 1-B는 이 Service를 통해서만 Mock 구현에 접근합니다.
export const studentService = {
  getState: getMockStudentState,
  getDashboardData: getMockDashboardData,
  saveTodayPlan: saveMockTodayPlan,
  submitCheckout: submitMockCheckout,
};

export type StudentService = {
  getState: typeof getMockStudentState;
  getDashboardData: typeof getMockDashboardData;
  saveTodayPlan: (plannedCheckOutTime: string, tasks: Task[]) => ReturnType<typeof saveMockTodayPlan>;
  submitCheckout: (
    tasks: Task[],
    statuses: Record<string, TaskStatus>,
    reasons: Record<string, string>,
  ) => ReturnType<typeof submitMockCheckout>;
};
