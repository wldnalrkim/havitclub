import { formatToday, mockStudent, type Recovery, type Task } from "@/lib/mock-data";
import { EmptyState, StatusPill } from "@/components/ui";

const subjectTagStyles: Record<string, string> = {
  국어: "bg-rose-50 text-rose-600",
  수학: "bg-blue-50 text-blue-600",
  영어: "bg-violet-50 text-violet-600",
  사회: "bg-amber-50 text-amber-600",
  과학: "bg-emerald-50 text-emerald-600",
  역사: "bg-orange-50 text-orange-600",
};

export function TodayScreen({
  onNavigate,
  plannedCheckOutTime,
  recovery,
  tasks,
}: {
  onNavigate: (screen: "plan" | "checkout" | "next-plan") => void;
  plannedCheckOutTime: string;
  recovery: Recovery | null;
  tasks: Task[];
}) {
  const hasPlan = tasks.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">{formatToday()}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">
          오늘도 한 걸음, {mockStudent.name}님
        </h1>
      </div>

      <section className="rounded-3xl bg-[#243b53] p-5 text-white shadow-[0_14px_30px_rgba(36,59,83,0.18)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[#c8d8e6]">오늘의 다음 행동</p>
            <h2 className="mt-2 text-xl font-bold">{hasPlan ? "계획을 실행해 볼까요?" : "오늘 계획을 세워볼까요?"}</h2>
          </div>
          <span className="text-2xl">☀</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#dbe7f0]">
          {hasPlan ? "하원 전까지 나의 계획을 하나씩 확인해 보세요." : "오늘 할 일을 3개 이상 골라보세요."}
        </p>
        <button
          className="mt-5 w-full rounded-2xl bg-[#f5c36b] px-4 py-3.5 text-sm font-bold text-[#243b53] transition hover:bg-[#ffd68d]"
          onClick={() => onNavigate(hasPlan ? "checkout" : "plan")}
        >
          {hasPlan ? "하원 준비하기" : "오늘 계획 세우기"}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[#8a98a8]">예정 하원</p>
          <p className="mt-2 text-lg font-bold text-[#243b53]">{plannedCheckOutTime}</p>
          <StatusPill tone="blue">오늘 약속</StatusPill>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[#8a98a8]">현재 상태</p>
          <p className="mt-2 text-lg font-bold text-[#243b53]">등원 중</p>
          <StatusPill tone="green">09:08 등원</StatusPill>
        </div>
      </section>

      {hasPlan ? (
        <section className="rounded-3xl bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#243b53]">오늘의 계획</h2>
            <button className="text-sm font-semibold text-[#2f6690]" onClick={() => onNavigate("plan")}>
              수정
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {tasks.map((task, index) => (
              <div className="flex items-center gap-3 rounded-2xl bg-[#f7f9fa] p-3" key={task.id}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e7f0f8] text-sm font-bold text-[#2f6690]">
                  {index + 1}
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${subjectTagStyles[task.subject] ?? "bg-slate-50 text-slate-600"}`}>
                    {task.subject}
                  </span>
                  <p className="truncate text-sm font-semibold text-[#334e68]">{task.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          action={
            <button className="rounded-2xl bg-[#2f6690] px-4 py-3 text-sm font-bold text-white" onClick={() => onNavigate("plan")}>
              핵심 계획 추가하기
            </button>
          }
          description="오늘 꼭 해내고 싶은 일을 3개 이상 정해보세요."
          title="아직 오늘 계획이 없어요"
        />
      )}

      {recovery?.status === "open" && (
        <section className="rounded-3xl border border-[#f4dcae] bg-[#fffaf0] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#a4772b]">Recovery · 이어서 하기</p>
              <h2 className="mt-2 text-sm font-bold text-[#76551e]">{recovery.title}</h2>
              <p className="mt-1 text-xs text-[#927442]">{recovery.scheduledAt}까지 마무리해요.</p>
            </div>
            <span className="rounded-full bg-[#f8e8bd] px-2.5 py-1 text-xs font-bold text-[#966319]">진행 중</span>
          </div>
          <button
            className="mt-4 w-full rounded-2xl bg-[#f3d58f] px-4 py-3 text-sm font-bold text-[#76551e] transition hover:bg-[#ebca7b]"
            onClick={() => onNavigate("next-plan")}
          >
            다음 계획 보기
          </button>
        </section>
      )}
      {recovery?.status === "completed" && (
        <section className="rounded-3xl border border-[#b8e0ca] bg-[#effaf3] p-5">
          <p className="text-xs font-bold text-[#24734d]">Recovery 완료</p>
          <p className="mt-2 text-sm font-semibold text-[#3b7658]">{recovery.title}</p>
          <p className="mt-1 text-xs text-[#5f9275]">다음 계획으로 잘 이어졌어요.</p>
        </section>
      )}
    </div>
  );
}
