import { formatDateLabel } from "@/lib/mock-data";
import { advanceMockDay } from "@/mock/mock-student-service";

// MOCK ONLY: Phase 1-B UX/UI 테스트용 도구입니다. Phase 2 실제 API 연결 시 이 파일과 AppShell의 사용처를 제거합니다.
export function MockDevToolbar({ currentDate, onChanged }: { currentDate: string; onChanged: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 pt-4">
      <div className="flex min-w-0 items-center gap-2 rounded-full border border-dashed border-[#c9d4dd] bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#607080]">
        <span className="shrink-0 rounded-full bg-[#eef1f4] px-1.5 py-0.5 text-[10px] text-[#607080]">테스트</span>
        <span className="truncate">{formatDateLabel(currentDate)}</span>
      </div>
      <button
        className="shrink-0 rounded-full border border-dashed border-[#9bb7c9] px-3 py-1.5 text-[11px] font-bold text-[#2f6690] transition hover:bg-[#eef4f7]"
        onClick={() => {
          advanceMockDay();
          onChanged();
        }}
        type="button"
      >
        다음 날로 넘기기 →
      </button>
    </div>
  );
}
