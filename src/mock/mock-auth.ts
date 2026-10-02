import { mockStudent } from "@/mock/initial-mock-state";
import { saveMockSession } from "@/mock/mock-storage";

const MOCK_PIN = "123456";

export type MockAuthResult =
  | { success: true; studentId: string }
  | { success: false; error: string };

// MOCK ONLY: Phase 1-B UX/UI 테스트용 인증입니다.
export function loginMock(phoneSuffix: string, pin: string): MockAuthResult {
  if (phoneSuffix !== mockStudent.phoneSuffix || pin !== MOCK_PIN) {
    return {
      success: false,
      error: "전화번호 뒷자리 또는 PIN을 확인해주세요.",
    };
  }

  saveMockSession({ studentId: mockStudent.studentId });
  return { success: true, studentId: mockStudent.studentId };
}
