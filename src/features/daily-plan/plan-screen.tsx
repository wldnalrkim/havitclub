import { useState, type FormEvent } from "react";
import { mockPlan, subjectOptions, type SubjectOption, type Task } from "@/lib/mock-data";
import { CarryOverBadge, EmptyState } from "@/components/ui";

type DraftTask = Task & {
  subjectTag: SubjectOption | "";
  customSubject: string;
  isNew: boolean;
};

type TimeParts = {
  period: "오전" | "오후";
  hour: string;
  minute: string;
};

const MIN_TASK_COUNT = 3;
const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function parseTime(time: string): TimeParts {
  const [rawHour = "21", rawMinute = "30"] = time.split(":");
  const hour24 = Number(rawHour);
  const hour12 = hour24 % 12 || 12;
  const minute = Math.min(55, Math.max(0, Math.floor(Number(rawMinute) / 5) * 5));

  return {
    period: hour24 >= 12 ? "오후" : "오전",
    hour: String(hour12).padStart(2, "0"),
    minute: String(minute).padStart(2, "0"),
  };
}

function formatStoredTime({ period, hour, minute }: TimeParts) {
  const hourNumber = Number(hour);
  const hour24 = period === "오전"
    ? hourNumber === 12 ? 0 : hourNumber
    : hourNumber === 12 ? 12 : hourNumber + 12;

  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

function formatDisplayTime(time: string) {
  const { period, hour, minute } = parseTime(time);
  return `${period} ${hour}:${minute}`;
}

const idleTagStyle = "border-[#d9e2e9] bg-white text-[#607080] hover:border-[#9bb7c9] hover:bg-[#f7f9fa]";

const selectedTagStyles: Record<SubjectOption, string> = {
  국어: "border-rose-200 bg-rose-50 text-rose-600",
  수학: "border-blue-200 bg-blue-50 text-blue-600",
  영어: "border-violet-200 bg-violet-50 text-violet-600",
  사회: "border-amber-200 bg-amber-50 text-amber-600",
  과학: "border-emerald-200 bg-emerald-50 text-emerald-600",
  역사: "border-orange-200 bg-orange-50 text-orange-600",
  기타: "border-slate-200 bg-slate-50 text-slate-600",
};

function toDraftTask(task: Task, isNew = false): DraftTask {
  const matchedSubject = subjectOptions.find((subject) => subject === task.subject);

  return {
    ...task,
    subjectTag: matchedSubject ?? "기타",
    customSubject: matchedSubject ? "" : task.subject,
    isNew,
  };
}

function createEmptyTask(isNew = false): DraftTask {
  return {
    id: `task-${Date.now()}-${Math.random()}`,
    title: "",
    subject: "",
    subjectTag: "",
    customSubject: "",
    status: "pending",
    isNew,
  };
}

function createInitialDrafts(tasks: Task[], carryOverTasks: Task[]) {
  if (tasks.length > 0) return tasks.map((task) => toDraftTask(task));

  const carried = carryOverTasks.map((task) => toDraftTask(task));
  const emptyCount = Math.max(0, MIN_TASK_COUNT - carried.length);
  return [...carried, ...Array.from({ length: emptyCount }, () => createEmptyTask())];
}

function getSubject(task: DraftTask) {
  return task.subjectTag === "기타" ? task.customSubject.trim() : task.subjectTag;
}

function getTaskError(task: DraftTask) {
  if (!task.subjectTag) return "subject";
  if (!getSubject(task)) return "custom";
  if (!task.title.trim()) return "title";
  return null;
}

export function PlanScreen({
  carryOverTasks,
  isInitialPlan,
  isLocked,
  onCancel,
  onSave,
  plannedCheckOutTime,
  tasks,
}: {
  carryOverTasks: Task[];
  isInitialPlan: boolean;
  isLocked: boolean;
  onCancel: () => void;
  onSave: (tasks: Task[], leaveTime: string) => void;
  plannedCheckOutTime: string;
  tasks: Task[];
}) {
  const [timeParts, setTimeParts] = useState<TimeParts>(() => parseTime(plannedCheckOutTime || mockPlan.plannedCheckOutTime));
  const [timeNotice, setTimeNotice] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [openSubjectTaskId, setOpenSubjectTaskId] = useState<string | null>(null);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>(() => createInitialDrafts(tasks, carryOverTasks));

  if (isLocked) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-[#718096]">오늘 계획</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">오늘 계획을 마무리했어요</h1>
        </div>
        <EmptyState
          action={
            <button className="rounded-2xl bg-[#2f6690] px-5 py-3 text-sm font-bold text-white" onClick={onCancel}>
              오늘 화면으로 돌아가기
            </button>
          }
          description="체크아웃을 마친 계획은 수정할 수 없어요. 다음 계획은 내일 새로 세울 수 있어요."
          title="체크아웃 완료"
        />
      </div>
    );
  }

  const firstInvalidIndex = draftTasks.findIndex((task) => getTaskError(task));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draftTasks.length < MIN_TASK_COUNT || firstInvalidIndex >= 0) {
      setShowErrors(true);
      document.getElementById(`plan-card-${draftTasks[firstInvalidIndex]?.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onSave(
      draftTasks.map(({ subjectTag, customSubject, isNew, ...task }) => {
        void isNew;
        return {
          ...task,
          title: task.title.trim(),
          subject: subjectTag === "기타" ? customSubject.trim() : subjectTag,
        };
      }),
      formatStoredTime(timeParts),
    );
  }

  function addTask() {
    setDraftTasks((current) => [...current, createEmptyTask(true)]);
  }

  function removeTask(taskId: string) {
    setDraftTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function updateTask(taskId: string, title: string) {
    setDraftTasks((current) => current.map((task) => (task.id === taskId ? { ...task, title } : task)));
  }

  function updateSubjectTag(taskId: string, subjectTag: SubjectOption) {
    setDraftTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, subjectTag, subject: subjectTag === "기타" ? task.customSubject : subjectTag }
          : task,
      ),
    );
    setOpenSubjectTaskId(null);
  }

  function updateCustomSubject(taskId: string, customSubject: string) {
    setDraftTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, customSubject, subject: customSubject } : task)),
    );
  }

  const errorMessage = firstInvalidIndex >= 0
    ? {
        subject: `${firstInvalidIndex + 1}번 계획의 과목을 선택해 주세요.`,
        custom: `${firstInvalidIndex + 1}번 계획의 과목명을 입력해 주세요.`,
        title: `${firstInvalidIndex + 1}번 계획의 내용을 입력해 주세요.`,
      }[getTaskError(draftTasks[firstInvalidIndex]) as "subject" | "custom" | "title"]
    : "";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">오늘 계획</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">오늘 할 일을 골라요</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">오늘 꼭 해낼 계획을 3개 이상 정해요.</p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <section className="rounded-3xl bg-white p-5">
          <p className="text-sm font-bold text-[#334e68]">오늘 예정 하원시간</p>
          {isInitialPlan ? (
            <>
              <div className="mt-3 grid grid-cols-[auto_1fr_1fr] gap-2">
                <select
                  aria-label="오전 또는 오후"
                  className="rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-base font-semibold text-[#243b53] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
                  onChange={(event) => setTimeParts((current) => ({ ...current, period: event.target.value as TimeParts["period"] }))}
                  value={timeParts.period}
                >
                  <option>오전</option>
                  <option>오후</option>
                </select>
                <select
                  aria-label="하원 예정 시"
                  className="rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-base font-semibold text-[#243b53] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
                  onChange={(event) => setTimeParts((current) => ({ ...current, hour: event.target.value }))}
                  value={timeParts.hour}
                >
                  {hourOptions.map((hour) => <option key={hour} value={hour}>{hour}시</option>)}
                </select>
                <select
                  aria-label="하원 예정 분"
                  className="rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-base font-semibold text-[#243b53] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
                  onChange={(event) => setTimeParts((current) => ({ ...current, minute: event.target.value }))}
                  value={timeParts.minute}
                >
                  {minuteOptions.map((minute) => <option key={minute} value={minute}>{minute}분</option>)}
                </select>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#6b7b8c]">계획을 처음 저장할 때만 직접 설정할 수 있어요. 이후 변경은 코치님에게 직접 요청하세요.</p>
            </>
          ) : (
            <>
              <button
                className="mt-3 flex w-full items-center justify-between rounded-2xl border border-[#c8dbe7] bg-[#eef4f7] px-4 py-4 text-left text-[#2f6690] transition hover:bg-[#e7f0f5]"
                onClick={() => setTimeNotice(true)}
                type="button"
              >
                <span className="text-sm font-semibold">예정 하원시간</span>
                <span className="text-lg font-bold">{formatDisplayTime(plannedCheckOutTime)}</span>
              </button>
              {timeNotice && (
                <p className="mt-2 rounded-xl bg-[#f7f9fa] px-3 py-2.5 text-sm font-medium text-[#607080]" role="status">
                  예정 하원시간 변경은 코치님에게 직접 요청하세요.
                </p>
              )}
            </>
          )}
        </section>

        <section className="rounded-3xl bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#334e68]">핵심 계획</h2>
              <p className="mt-1 text-xs text-[#6b7b8c]">최소 3개 · 더 필요하면 계속 추가할 수 있어요</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${draftTasks.length >= MIN_TASK_COUNT ? "bg-[#e5f4ed] text-[#24734d]" : "bg-[#fff1d8] text-[#966319]"}`}>
              {draftTasks.length}개
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {draftTasks.map((task, index) => {
              const error = showErrors ? getTaskError(task) : null;
              const isSubjectOpen = !task.subjectTag || openSubjectTaskId === task.id;

              return (
                <div
                  className={`scroll-mt-24 rounded-2xl border p-4 ${
                    error ? "border-red-200 bg-red-50/30" : task.recoverySourceTaskId ? "border-[#f4dcae] bg-[#fffcf5]" : "border-[#e4ebef]"
                  }`}
                  id={`plan-card-${task.id}`}
                  key={task.id}
                >
                  <div className="flex min-h-10 items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#6b7b8c]">계획 {index + 1}</p>
                      {task.recoverySourceTaskId && <CarryOverBadge />}
                    </div>
                    {task.isNew && (
                      <button
                        aria-label={`${index + 1}번째 계획 삭제`}
                        className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-xl leading-none text-[#8796a5] transition hover:bg-[#f0f3f5] hover:text-[#607080]"
                        onClick={() => removeTask(task.id)}
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {isSubjectOpen ? (
                    <>
                      <p className={`mt-2 text-xs font-bold ${error === "subject" ? "text-red-500" : "text-[#607080]"}`}>
                        과목을 먼저 선택해 주세요
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {subjectOptions.map((subject) => (
                          <button
                            className={`min-h-10 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                              task.subjectTag === subject ? selectedTagStyles[subject] : idleTagStyle
                            }`}
                            key={subject}
                            onClick={() => updateSubjectTag(task.id, subject)}
                            type="button"
                          >
                            {subject}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full border px-3.5 py-2 text-xs font-semibold ${selectedTagStyles[task.subjectTag as SubjectOption]}`}>
                        {task.subjectTag === "기타" && task.customSubject.trim() ? task.customSubject : task.subjectTag}
                      </span>
                      <button
                        className="min-h-10 rounded-xl px-2 text-xs font-semibold text-[#2f6690] hover:underline"
                        onClick={() => setOpenSubjectTaskId(task.id)}
                        type="button"
                      >
                        과목 바꾸기
                      </button>
                    </div>
                  )}

                  {task.subjectTag === "기타" && (
                    <input
                      aria-label={`${index + 1}번째 계획 기타 과목`}
                      className={`mt-3 w-full rounded-xl border bg-[#fbfcfd] px-3 py-3 text-sm text-[#334e68] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8] ${
                        error === "custom" ? "border-red-300" : "border-[#d9e2e9]"
                      }`}
                      onChange={(event) => updateCustomSubject(task.id, event.target.value)}
                      placeholder="과목명을 직접 입력해 주세요"
                      value={task.customSubject}
                    />
                  )}
                  <label className="mt-4 block text-xs font-bold text-[#607080]" htmlFor={`task-${task.id}`}>
                    계획 내용
                  </label>
                  <input
                    aria-invalid={error === "title"}
                    className={`mt-2 w-full rounded-xl border bg-[#fbfcfd] px-3 py-3 text-base font-semibold text-[#334e68] outline-none placeholder:text-[#a9b5bf] focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8] sm:text-sm ${
                      error === "title" ? "border-red-300" : "border-[#d9e2e9]"
                    }`}
                    id={`task-${task.id}`}
                    onChange={(event) => updateTask(task.id, event.target.value)}
                    placeholder="예: 수학 문제집 2쪽 풀기"
                    value={task.title}
                  />
                  {task.recoverySourceTaskId && (
                    <p className="mt-2 text-xs leading-5 text-[#8a6d3b]">지난 계획에서 이어진 일이에요. 남은 분량에 맞게 내용을 고쳐도 돼요.</p>
                  )}
                </div>
              );
            })}
          </div>
          <button
            className="mt-4 w-full rounded-2xl border border-[#b8ccda] px-4 py-3 text-sm font-bold text-[#2f6690] transition hover:bg-[#f0f6f9]"
            onClick={addTask}
            type="button"
          >
            + 계획 더 추가하기
          </button>
        </section>

        {showErrors && errorMessage && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600" role="alert">{errorMessage}</p>
        )}
        <button
          className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576]"
          type="submit"
        >
          계획 저장하기
        </button>
        <button className="w-full py-3 text-sm font-semibold text-[#718096]" onClick={onCancel} type="button">
          취소하고 돌아가기
        </button>
      </form>
    </div>
  );
}
