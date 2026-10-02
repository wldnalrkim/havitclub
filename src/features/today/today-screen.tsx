import { formatDateLabel, type Recovery, type Task } from "@/lib/mock-data";
import { summarizeTasks } from "@/lib/progress";
import { CarryOverBadge, EmptyState, StatusPill, SubjectTag, TaskStatusBadge, taskStatusLabels } from "@/components/ui";

const recoveryCardStyles = {
  partial: "border-orange-200 bg-orange-50/60",
  incomplete: "border-red-200 bg-red-50/60",
  completed: "border-emerald-200 bg-emerald-50/60",
};

function formatTime(time: string) {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return `${hour >= 12 ? "오후" : "오전"} ${hour % 12 || 12}:${String(minute).padStart(2, "0")}`;
}

export function TodayScreen({
  carryOverCount,
  currentDate,
  isCheckedOut,
  onNavigate,
  plannedCheckOutTime,
  recoveries,
  studentName,
  tasks,
}: {
  carryOverCount: number;
  currentDate: string;
  isCheckedOut: boolean;
  onNavigate: (screen: "plan" | "checkout" | "next-plan" | "dashboard") => void;
  plannedCheckOutTime: string;
  recoveries: Recovery[];
  studentName: string;
  tasks: Task[];
}) {
  const hasPlan = tasks.length > 0;
  const summary = summarizeTasks(currentDate, tasks);

  const hero = isCheckedOut
    ? {
        eyebrow: "오늘 기록 완료",
        title: "오늘도 수고했어요",
        description: `계획 ${summary.total}개 중 완료 ${summary.completed} · 일부 완료 ${summary.partial} · 미완료 ${summary.incomplete}`,
        action: "내 현황 보기",
        target: "dashboard" as const,
      }
    : hasPlan
      ? {
          eyebrow: "오늘의 다음 행동",
          title: "계획을 실행해 볼까요?",
          description: "하원 전까지 나의 계획을 하나씩 확인해 보세요.",
          action: "하원 준비하기",
          target: "checkout" as const,
        }
      : {
          eyebrow: "오늘의 다음 행동",
          title: "오늘 계획을 세워볼까요?",
          description: carryOverCount > 0
            ? `이어서 할 계획 ${carryOverCount}개가 미리 채워져 있어요.`
            : "오늘 꼭 해낼 계획을 3개 이상 정해보세요.",
          action: "오늘 계획 세우기",
          target: "plan" as const,
        };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">{formatDateLabel(currentDate)}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">
          오늘도 한 걸음, {studentName}님
        </h1>
      </div>

      <section
        className={`rounded-3xl p-5 ${
          isCheckedOut ? "bg-[#eaf7ef] text-[#24734d]" : "bg-[#243b53] text-white shadow-[0_14px_30px_rgba(36,59,83,0.18)]"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm ${isCheckedOut ? "text-[#4d8064]" : "text-[#c8d8e6]"}`}>{hero.eyebrow}</p>
            <h2 className="mt-2 text-xl font-bold">{hero.title}</h2>
          </div>
          <span className="text-2xl">{isCheckedOut ? "✓" : "☀"}</span>
        </div>
        <p className={`mt-3 text-sm leading-6 ${isCheckedOut ? "text-[#4d8064]" : "text-[#dbe7f0]"}`}>{hero.description}</p>
        <button
          className={`mt-5 w-full rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
            isCheckedOut
              ? "bg-white text-[#24734d] hover:bg-[#f6fbf8]"
              : "bg-[#f5c36b] text-[#243b53] hover:bg-[#ffd68d]"
          }`}
          onClick={() => onNavigate(hero.target)}
        >
          {hero.action}
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[#6b7b8c]">예정 하원</p>
          <p className="mt-2 text-lg font-bold text-[#243b53]">{hasPlan ? formatTime(plannedCheckOutTime) : "—"}</p>
          <StatusPill tone={hasPlan ? "blue" : "slate"}>{hasPlan ? "오늘 약속" : "계획 후 확정"}</StatusPill>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs text-[#6b7b8c]">출결</p>
          <p className="mt-2 text-lg font-bold text-[#243b53]">—</p>
          <StatusPill tone="slate">아직 기록 없음</StatusPill>
        </div>
      </section>

      {hasPlan ? (
        <section className="rounded-3xl bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[#243b53]">오늘의 계획</h2>
            {isCheckedOut ? (
              <StatusPill tone="green">체크아웃 완료</StatusPill>
            ) : (
              <button className="-mr-2 rounded-xl px-3 py-2 text-sm font-semibold text-[#2f6690]" onClick={() => onNavigate("plan")}>
                수정
              </button>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {tasks.map((task, index) => (
              <div className="flex items-center gap-3 rounded-2xl bg-[#f7f9fa] p-3" key={task.id}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e7f0f8] text-sm font-bold text-[#2f6690]">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <SubjectTag subject={task.subject} />
                  <p className="truncate text-sm font-semibold text-[#334e68]">{task.title}</p>
                  {task.recoverySourceTaskId && <CarryOverBadge />}
                </div>
                {isCheckedOut && <TaskStatusBadge status={task.status} />}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          action={
            <button className="rounded-2xl bg-[#2f6690] px-5 py-3 text-sm font-bold text-white" onClick={() => onNavigate("plan")}>
              핵심 계획 추가하기
            </button>
          }
          description={
            carryOverCount > 0
              ? `지난 계획 중 이어서 할 일 ${carryOverCount}개가 있어요. 계획을 세우면 자동으로 들어가요.`
              : "오늘 꼭 해내고 싶은 일을 3개 이상 정해보세요."
          }
          title="아직 오늘 계획이 없어요"
        />
      )}

      {recoveries.length > 0 && (
        <section className="rounded-3xl border border-[#f4dcae] bg-[#fffaf0] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#a4772b]">Recovery · 이어서 하기</p>
              <h2 className="mt-2 text-sm font-bold text-[#76551e]">마치지 못한 계획 {recoveries.length}개가 다음 계획으로 이어져요.</h2>
              <p className="mt-1 text-xs text-[#8a6d3b]">사라지지 않고 다음 날 계획에 자동으로 채워져요.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {recoveries.map((recovery) => (
              <div className={`rounded-2xl border p-3 ${recoveryCardStyles[recovery.sourceTaskStatus]}`} key={recovery.sourceTaskId}>
                <div className="flex items-center gap-2">
                  {recovery.sourceTaskSubject && <SubjectTag subject={recovery.sourceTaskSubject} />}
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#334e68]">{recovery.sourceTaskTitle}</p>
                </div>
                <p className="mt-1.5 text-xs text-[#607080]">
                  {taskStatusLabels[recovery.sourceTaskStatus]} · {recovery.incompleteReason ?? recovery.scheduledAt}
                </p>
              </div>
            ))}
          </div>
          <button
            className="mt-4 w-full rounded-2xl bg-[#f3d58f] px-4 py-3 text-sm font-bold text-[#76551e] transition hover:bg-[#ebca7b]"
            onClick={() => onNavigate("next-plan")}
          >
            다음 계획 보기
          </button>
        </section>
      )}
    </div>
  );
}
