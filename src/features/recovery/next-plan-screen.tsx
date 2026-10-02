import type { Recovery } from "@/lib/mock-data";
import { CarryOverBadge, StatusPill, SubjectTag, taskStatusLabels } from "@/components/ui";

const recoveryCardStyles = {
  partial: "border-orange-200 bg-orange-50/60",
  incomplete: "border-red-200 bg-red-50/60",
  completed: "border-emerald-200 bg-emerald-50/60",
};

const steps = [
  { icon: "↻", tone: "bg-[#f8e8bd] text-[#966319]", title: "오늘 마치지 못한 계획", description: "Recovery로 기록돼요" },
  { icon: "→", tone: "bg-[#e7f0f8] text-[#2f6690]", title: "다음 날 계획 세우기", description: "계획 목록에 자동으로 채워져요" },
  { icon: "✓", tone: "bg-[#e5f4ed] text-[#24734d]", title: "이어서 완료하기", description: "내 현황에 '이어서 해낸 계획'으로 쌓여요" },
];

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
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">다음 계획에 이렇게 들어가요</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">
          마치지 못한 계획은 사라지지 않고 다음 날 할 일로 이어져요.
        </p>
      </div>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-[#334e68]">다음 날 계획 미리보기</h2>
          <StatusPill tone="amber">{recoveries.length}개 이어짐</StatusPill>
        </div>
        <div className="mt-4 space-y-2">
          {recoveries.map((recovery, index) => (
            <div className={`rounded-2xl border p-4 ${recoveryCardStyles[recovery.sourceTaskStatus]}`} key={recovery.sourceTaskId}>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-[#6b7b8c]">계획 {index + 1}</p>
                <CarryOverBadge />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {recovery.sourceTaskSubject && <SubjectTag subject={recovery.sourceTaskSubject} />}
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#334e68]">{recovery.sourceTaskTitle}</p>
              </div>
              <p className="mt-1.5 text-xs text-[#607080]">
                오늘 {taskStatusLabels[recovery.sourceTaskStatus]} · {recovery.incompleteReason ?? recovery.scheduledAt}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5">
        <h2 className="font-bold text-[#334e68]">이렇게 이어져요</h2>
        <div className="mt-4 space-y-3">
          {steps.map((step) => (
            <div className="flex items-center gap-3 rounded-2xl bg-[#f7f9fa] p-3" key={step.title}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold ${step.tone}`}>{step.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[#334e68]">{step.title}</p>
                <p className="mt-0.5 text-xs text-[#6b7b8c]">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white" onClick={onBack}>
        오늘 화면으로 돌아가기
      </button>
    </div>
  );
}
