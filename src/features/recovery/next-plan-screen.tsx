import type { Recovery } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui";

const recoveryCardStyles = {
  partial: "border-orange-200 bg-orange-50/60",
  incomplete: "border-red-200 bg-red-50/60",
  completed: "border-emerald-200 bg-emerald-50/60",
};

export function NextPlanScreen({
  onBack,
  recoveries,
}: {
  onBack: () => void;
  recoveries: Recovery[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">다음 계획</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">다음 계획에 반영했어요</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">
          미완료된 계획은 사라지지 않고 다음에 할 일로 이어집니다.
        </p>
      </div>

      <section className="rounded-3xl border border-[#f4dcae] bg-[#fffaf0] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#a4772b]">Recovery에서 이어진 계획</p>
            <h2 className="mt-2 text-base font-bold text-[#76551e]">{recoveries.length}건이 다음 계획에 반영됨</h2>
          </div>
          <StatusPill tone="amber">다음 계획</StatusPill>
        </div>
        <div className="mt-4 space-y-2">
          {recoveries.map((recovery) => (
            <div className={`rounded-2xl border p-4 ${recoveryCardStyles[recovery.sourceTaskStatus]}`} key={recovery.sourceTaskId}>
              <p className="text-sm font-bold text-[#76551e]">{recovery.sourceTaskTitle}</p>
              <p className="mt-1 text-xs text-[#927442]">
                {recovery.sourceTaskStatus === "partial" ? "일부 완료" : recovery.sourceTaskStatus === "completed" ? "완료" : "미완료"} · {recovery.incompleteReason ?? recovery.scheduledAt}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5">
        <h2 className="font-bold text-[#334e68]">이렇게 반영돼요</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-[#f7f9fa] p-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#f8e8bd] text-sm font-bold text-[#966319]">↻</span>
            <div>
              <p className="text-sm font-semibold text-[#334e68]">오늘의 미완료 계획</p>
              <p className="mt-0.5 text-xs text-[#8a98a8]">Recovery로 기록됨</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-[#f7f9fa] p-3">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e7f0f8] text-sm font-bold text-[#2f6690]">→</span>
            <div>
              <p className="text-sm font-semibold text-[#334e68]">다음 계획</p>
              <p className="mt-0.5 text-xs text-[#8a98a8]">할 일 목록에 자동으로 이어짐</p>
            </div>
          </div>
        </div>
      </section>

      <button className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white" onClick={onBack}>
        오늘 화면으로 돌아가기
      </button>
    </div>
  );
}
