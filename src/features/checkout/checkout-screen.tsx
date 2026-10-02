import { useState } from "react";
import { incompleteReasons, type Recovery, type Task, type TaskStatus } from "@/lib/mock-data";
import { CarryOverBadge, StatusPill, SubjectTag, TaskStatusBadge, taskStatusLabels } from "@/components/ui";

const statusOptions: { label: string; value: TaskStatus }[] = [
  { label: "완료", value: "completed" },
  { label: "일부 완료", value: "partial" },
  { label: "미완료", value: "incomplete" },
];

const statusStyles: Record<TaskStatus, string> = {
  pending: "border-[#e1e8ed] text-[#718096] hover:border-[#9bb7c9]",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-600",
  partial: "border-orange-200 bg-orange-50 text-orange-600",
  incomplete: "border-red-200 bg-red-50 text-red-600",
};

export function CheckoutScreen({
  onDone,
  onSubmitted,
  tasks,
}: {
  onDone: () => void;
  onSubmitted: (statuses: Record<string, TaskStatus>, reasons: Record<string, string>) => Recovery[];
  tasks: Task[];
}) {
  const planTasks = tasks;
  const savedStatuses = () => Object.fromEntries(planTasks.map((task) => [task.id, task.status])) as Record<string, TaskStatus>;
  const savedReasons = () => Object.fromEntries(planTasks.map((task) => [task.id, task.incompleteReason ?? ""]));
  const [statuses, setStatuses] = useState<Record<string, TaskStatus>>(savedStatuses);
  const [reasons, setReasons] = useState<Record<string, string>>(savedReasons);
  const [submitted, setSubmitted] = useState(false);
  const [createdRecoveries, setCreatedRecoveries] = useState<Recovery[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const isAlreadySubmitted = planTasks.length > 0 && planTasks.every((task) => task.status !== "pending");
  const isReadOnly = isAlreadySubmitted && !isEditing && !submitted;

  function updateStatus(taskId: string, status: TaskStatus) {
    if (isReadOnly) return;
    setStatuses((current) => ({ ...current, [taskId]: status }));
  }

  function updateReason(taskId: string, reason: string) {
    if (isReadOnly) return;
    setReasons((current) => ({ ...current, [taskId]: reason }));
  }

  function handleSubmit() {
    const hasUnselectedTask = planTasks.some((task) => !statuses[task.id] || statuses[task.id] === "pending");
    const hasMissingReason = planTasks.some((task) => {
      const status = statuses[task.id];
      return (status === "partial" || status === "incomplete") && !reasons[task.id];
    });

    if (hasUnselectedTask) {
      setSubmitError("모든 계획의 상태를 선택해 주세요.");
      return;
    }
    if (hasMissingReason) {
      setSubmitError("일부 완료 또는 미완료 계획의 이유를 선택해 주세요.");
      return;
    }

    setSubmitError("");
    setCreatedRecoveries(onSubmitted(statuses, reasons));
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl bg-[#eaf7ef] p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-2xl text-[#24734d]">✓</div>
          <h1 className="mt-4 text-xl font-bold text-[#24734d]">오늘 기록을 남겼어요</h1>
          <p className="mt-2 text-sm leading-6 text-[#4d8064]">오늘 한 일을 확인하고, 내일을 조금 더 편하게 준비해요.</p>
        </div>
        {createdRecoveries.length > 0 && (
          <div className="rounded-3xl bg-white p-5">
            <StatusPill tone="amber">Recovery {createdRecoveries.length}건 생성됨</StatusPill>
            <div className="mt-3 space-y-2">
              {createdRecoveries.map((recovery) => (
                <div className="rounded-2xl bg-[#f7f9fa] p-3" key={recovery.sourceTaskId}>
                  <div className="flex items-center gap-2">
                    {recovery.sourceTaskSubject && <SubjectTag subject={recovery.sourceTaskSubject} />}
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#334e68]">{recovery.sourceTaskTitle}</p>
                  </div>
                  <p className="mt-1.5 text-xs text-[#6b7b8c]">
                    {taskStatusLabels[recovery.sourceTaskStatus]} 이유: {recovery.incompleteReason ?? "다음 일정으로 이어짐"}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6b7b8c]">다음 날 계획을 세울 때 자동으로 채워져요.</p>
          </div>
        )}
        <button className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white" onClick={onDone}>
          오늘 화면으로 돌아가기
        </button>
      </div>
    );
  }

  if (planTasks.length === 0) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-[#718096]">체크아웃</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">아직 제출한 계획이 없어요</h1>
          <p className="mt-2 text-sm leading-6 text-[#718096]">오늘 계획을 먼저 작성한 뒤 체크아웃할 수 있어요.</p>
        </div>
        <button className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white" onClick={onDone}>
          오늘 화면으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">체크아웃</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">오늘은 어땠나요?</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">완벽하지 않아도 괜찮아요. 실제로 한 일을 남겨주세요.</p>
      </div>

      <div className="space-y-3">
        {planTasks.map((task) => {
          const selected = statuses[task.id];
          return (
            <section className="rounded-3xl bg-white p-5" key={task.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <SubjectTag subject={task.subject} />
                    {task.recoverySourceTaskId && <CarryOverBadge />}
                  </div>
                  <h2 className="mt-2 text-sm font-bold text-[#334e68]">{task.title}</h2>
                </div>
                {selected && selected !== "pending" && <TaskStatusBadge status={selected} />}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {statusOptions.map((option) => (
                  <button
                    className={`min-h-11 rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                        selected === option.value
                        ? statusStyles[option.value]
                        : statusStyles.pending
                    }`}
                    key={option.value}
                    onClick={() => updateStatus(task.id, option.value)}
                    disabled={isReadOnly}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {(selected === "partial" || selected === "incomplete") && (
                <select
                  className="mt-3 w-full rounded-xl border border-[#e1e8ed] bg-white px-3 py-3 text-sm text-[#607080]"
                  disabled={isReadOnly}
                  onChange={(event) => updateReason(task.id, event.target.value)}
                  value={reasons[task.id] ?? ""}
                >
                  <option disabled value="">이유를 선택해 주세요</option>
                  {incompleteReasons.map((reason) => <option key={reason}>{reason}</option>)}
                </select>
              )}
            </section>
          );
        })}
      </div>

      {submitError && <p className="text-sm font-medium text-[#b45353]" role="alert">{submitError}</p>}
      <div className="flex gap-3">
        {isAlreadySubmitted && !submitted && (
          <button
            className="flex-1 rounded-2xl border border-[#b8ccda] px-4 py-4 text-sm font-bold text-[#2f6690]"
            onClick={() => {
              if (isEditing) {
                setStatuses(savedStatuses());
                setReasons(savedReasons());
                setSubmitError("");
              }
              setIsEditing(!isEditing);
            }}
            type="button"
          >
            {isEditing ? "수정 취소" : "수정하기"}
          </button>
        )}
        {isAlreadySubmitted && !submitted && !isEditing ? (
          <button className="flex-1 rounded-2xl bg-[#eef4f7] px-4 py-4 text-sm font-bold text-[#7890a1]" disabled type="button">
            오늘 기록 저장됨
          </button>
        ) : (
          <button
            className="flex-1 rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576]"
            onClick={handleSubmit}
            type="button"
          >
            오늘 기록 저장하기
          </button>
        )}
      </div>
    </div>
  );
}
