import { formatToday, mockPlan, mockStudent } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui";

export function TodayScreen({ onNavigate }: { onNavigate: (screen: "plan" | "checkout") => void }) {
  const hasPlan = mockPlan.tasks.length > 0;

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
          {hasPlan ? "하원 전까지 핵심 과업을 하나씩 확인해 보세요." : "오늘 할 일을 최대 3개만 골라보세요."}
        </p>
        <button
          className="mt-5 w-full rounded-2xl bg-[#f5c36b] px-4 py-3.5 text-sm font-bold text-[#243b53] transition hover:bg-[#ffd68d]"
          onClick={() => onNavigate(hasPlan ? "checkout" : "plan")}
        >
          {hasPlan ? "체크아웃 준비하기" : "오늘 계획 세우기"}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[#8a98a8]">예정 하원</p>
          <p className="mt-2 text-lg font-bold text-[#243b53]">{mockPlan.plannedCheckOutTime}</p>
          <StatusPill tone="blue">오늘 약속</StatusPill>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[#8a98a8]">현재 상태</p>
          <p className="mt-2 text-lg font-bold text-[#243b53]">등원 중</p>
          <StatusPill tone="green">09:08 등원</StatusPill>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#243b53]">오늘의 핵심 과업</h2>
          <button className="text-sm font-semibold text-[#2f6690]" onClick={() => onNavigate("plan")}>
            수정
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {mockPlan.tasks.map((task, index) => (
            <div className="flex items-center gap-3 rounded-2xl bg-[#f7f9fa] p-3" key={task.id}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e7f0f8] text-sm font-bold text-[#2f6690]">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#334e68]">{task.title}</p>
                <p className="mt-0.5 text-xs text-[#8a98a8]">{task.subject}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-[#f4dcae] bg-[#fffaf0] p-4">
        <p className="text-sm font-semibold text-[#76551e]">Recovery 1건이 있어요</p>
        <p className="mt-1 text-xs leading-5 text-[#927442]">지난 계획에서 이어서 할 일이 있습니다. 오늘의 흐름에 맞춰 확인해 보세요.</p>
      </div>
    </div>
  );
}
