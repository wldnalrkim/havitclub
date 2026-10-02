import { createInitialMockState, type MockState } from "@/mock/initial-mock-state";

const DATA_KEY = "havitclub_mock_data";
const SESSION_KEY = "havitclub_mock_session";

export type MockSession = {
  studentId: string;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getMockState(): MockState {
  if (!canUseStorage()) return createInitialMockState();

  const stored = window.localStorage.getItem(DATA_KEY);
  if (!stored) return createInitialMockState();

  try {
    const parsed = JSON.parse(stored) as Partial<MockState> & {
      recovery?: MockState["recoveries"][number];
    };
    const legacyRecovery = parsed.recovery;
    const initialState = createInitialMockState();
    const currentDate = parsed.currentDate ?? initialState.currentDate;
    const storedRecoveries = Array.isArray(parsed.recoveries)
      ? parsed.recoveries
      : legacyRecovery
        ? [legacyRecovery]
        : [];

    return {
      ...initialState,
      ...parsed,
      currentDate,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      recoveries: storedRecoveries.map((recovery) => ({
        ...recovery,
        sourceTaskId: recovery.sourceTaskId ?? `legacy-${recovery.title}`,
        sourceTaskTitle: recovery.sourceTaskTitle ?? recovery.title,
        sourceTaskStatus: recovery.sourceTaskStatus ?? "incomplete",
        sourceDate: recovery.sourceDate ?? currentDate,
      })),
    };
  } catch {
    return createInitialMockState();
  }
}

export function saveMockState(state: MockState) {
  if (canUseStorage()) {
    window.localStorage.setItem(DATA_KEY, JSON.stringify(state));
  }
}

export function getMockSession(): MockSession | null {
  if (!canUseStorage()) return null;

  const stored = window.localStorage.getItem(SESSION_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as MockSession;
  } catch {
    return null;
  }
}

export function saveMockSession(session: MockSession) {
  if (canUseStorage()) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

// MOCK ONLY: Phase 1-B에서 테스트를 처음부터 다시 시작하기 위한 초기화입니다.
export function clearMockData() {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(DATA_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}
