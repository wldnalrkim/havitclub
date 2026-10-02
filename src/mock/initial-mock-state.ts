import type { DailyRecord, Recovery, Task } from "@/lib/mock-data";

export type MockTodayPlan = {
  plannedCheckOutTime: string;
  tasks: Task[];
  status: "editing" | "submitted";
};

export type MockState = {
  currentDate: string;
  todayPlan: MockTodayPlan | null;
  history: DailyRecord[];
  recoveries: Recovery[];
  attendance: [];
  studyRecords: [];
  habitScore: null;
};

export const mockStudent = {
  studentId: "STU-023",
  name: "김지우",
  phoneSuffix: "4288",
};

// MOCK ONLY: 테스트를 시작하는 가상 날짜입니다. Phase 2에서는 서버가 Asia/Seoul 기준으로 결정합니다.
export const MOCK_START_DATE = "2026-09-25";

export function createInitialMockState(): MockState {
  return {
    currentDate: MOCK_START_DATE,
    todayPlan: null,
    history: [],
    recoveries: [],
    attendance: [],
    studyRecords: [],
    habitScore: null,
  };
}
