import { useState, type FormEvent } from "react";
import { mockPlan, subjectOptions, type SubjectOption, type Task } from "@/lib/mock-data";

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

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String((index + 1) * 5).padStart(2, "0"));

function parseTime(time: string): TimeParts {
  const [rawHour = "21", rawMinute = "30"] = time.split(":");
  const hour24 = Number(rawHour);
  const hour12 = hour24 % 12 || 12;
  const minute = Math.min(60, Math.max(5, Math.ceil(Number(rawMinute) / 5) * 5));

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

const subjectTagStyles: Record<SubjectOption, { selected: string; idle: string }> = {
  국어: {
    selected: "border-rose-200 bg-rose-50 text-rose-600",
    idle: "border-[#d9e2e9] bg-white text-[#718096] hover:border-[#9bb7c9] hover:bg-[#f7f9fa]",
  },
  수학: {
    selected: "border-blue-200 bg-blue-50 text-blue-600",
    idle: "border-[#d9e2e9] bg-white text-[#718096] hover:border-[#9bb7c9] hover:bg-[#f7f9fa]",
  },
  영어: {
    selected: "border-violet-200 bg-violet-50 text-violet-600",
    idle: "border-[#d9e2e9] bg-white text-[#718096] hover:border-[#9bb7c9] hover:bg-[#f7f9fa]",
  },
  사회: {
    selected: "border-amber-200 bg-amber-50 text-amber-600",
    idle: "border-[#d9e2e9] bg-white text-[#718096] hover:border-[#9bb7c9] hover:bg-[#f7f9fa]",
  },
  과학: {
    selected: "border-emerald-200 bg-emerald-50 text-emerald-600",
    idle: "border-[#d9e2e9] bg-white text-[#718096] hover:border-[#9bb7c9] hover:bg-[#f7f9fa]",
  },
  역사: {
    selected: "border-orange-200 bg-orange-50 text-orange-600",
    idle: "border-[#d9e2e9] bg-white text-[#718096] hover:border-[#9bb7c9] hover:bg-[#f7f9fa]",
  },
  기타: {
    selected: "border-slate-200 bg-slate-50 text-slate-600",
    idle: "border-[#d9e2e9] bg-white text-[#718096] hover:border-[#9bb7c9] hover:bg-[#f7f9fa]",
  },
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

export function PlanScreen({
  isInitialPlan,
  onCancel,
  onSave,
  plannedCheckOutTime,
  tasks,
}: {
  isInitialPlan: boolean;
  onCancel: () => void;
  onSave: (tasks: Task[], leaveTime: string) => void;
  plannedCheckOutTime: string;
  tasks: Task[];
}) {
  const [timeParts, setTimeParts] = useState<TimeParts>(() => parseTime(plannedCheckOutTime || mockPlan.plannedCheckOutTime));
  const [timeNotice, setTimeNotice] = useState(false);
  const [saved, setSaved] = useState(false);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>(
    tasks.length > 0 ? tasks.map((task) => toDraftTask(task)) : [createEmptyTask(), createEmptyTask(), createEmptyTask()],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draftTasks.length < 3 || draftTasks.some((task) => !task.title.trim() || !getSubject(task).trim())) {
      return;
    }
    setSaved(true);
    onSave(
      draftTasks.map(({ subjectTag, customSubject, ...task }) => ({
        ...task,
        subject: subjectTag === "기타" ? customSubject.trim() : subjectTag,
      })),
      formatStoredTime(timeParts),
    );
  }

  function addTask() {
    setDraftTasks((current) => [
      ...current,
      createEmptyTask(true),
    ]);
  }

  function removeTask(taskId: string) {
    setDraftTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function updateTask(taskId: string, title: string) {
    setDraftTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, title } : task)),
    );
  }

  function updateSubjectTag(taskId: string, subjectTag: SubjectOption) {
    setDraftTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, subjectTag, subject: subjectTag === "기타" ? task.customSubject : subjectTag }
          : task,
      ),
    );
  }

  function updateCustomSubject(taskId: string, customSubject: string) {
    setDraftTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, customSubject, subject: customSubject } : task,
      ),
    );
  }

  function getSubject(task: DraftTask) {
    return task.subjectTag === "기타" ? task.customSubject : task.subjectTag;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">오늘 계획</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">오늘 할 일을 골라요</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">가장 중요한 일 3개만 정하면 충분해요.</p>
      </div>

      {saved && (
        <div className="rounded-2xl border border-[#b8e0ca] bg-[#effaf3] p-4 text-sm font-semibold text-[#24734d]" role="status">
          오늘 계획을 저장했어요. 실행할 준비가 되었습니다.
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
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
              <p className="mt-2 text-xs leading-5 text-[#8a98a8]">계획을 처음 저장할 때만 직접 설정할 수 있어요. 이후 설정은 코치님에게 직접 요청하세요.</p>
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
              <p className="mt-1 text-xs text-[#8a98a8]">최소 3개 · 더 필요하면 계속 추가할 수 있어요</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${draftTasks.length >= 3 ? "bg-[#e5f4ed] text-[#24734d]" : "bg-[#fff1d8] text-[#966319]"}`}>
              {draftTasks.length}개
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {draftTasks.map((task, index) => (
                <div className="rounded-2xl border border-[#e4ebef] p-4" key={task.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#8a98a8]">계획 {index + 1}</p>
                    {task.isNew && (
                      <button
                        aria-label={`${index + 1}번째 계획 삭제`}
                        className="grid h-7 w-7 place-items-center rounded-full text-lg leading-none text-[#9aa8b5] transition hover:bg-[#f0f3f5] hover:text-[#607080]"
                        onClick={() => removeTask(task.id)}
                        type="button"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-xs font-bold text-[#607080]">과목을 먼저 선택해 주세요</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {subjectOptions.map((subject) => (
                      <button
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${task.subjectTag === subject ? subjectTagStyles[subject].selected : subjectTagStyles[subject].idle}`}
                        key={subject}
                        onClick={() => updateSubjectTag(task.id, subject)}
                        type="button"
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                  {task.subjectTag === "기타" && (
                    <input
                      aria-label={`${index + 1}번째 계획 기타 과목`}
                      className="mt-3 w-full rounded-xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-sm text-[#334e68] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
                      onChange={(event) => updateCustomSubject(task.id, event.target.value)}
                      placeholder="과목명을 직접 입력해 주세요"
                      required
                      value={task.customSubject}
                    />
                  )}
                  <label className="mt-4 block text-xs font-bold text-[#607080]" htmlFor={`task-${task.id}`}>
                    계획 내용
                  </label>
                  <input
                    aria-label={`${index + 1}번째 계획 내용`}
                    className="mt-2 w-full rounded-xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-sm font-semibold text-[#334e68] outline-none placeholder:text-[#a9b5bf] focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
                    id={`task-${task.id}`}
                    onChange={(event) => updateTask(task.id, event.target.value)}
                    placeholder="예: 수학 문제집 2쪽 풀기"
                    required
                    value={task.title}
                  />
                </div>
              ))}
          </div>
          <button
            className="mt-4 w-full rounded-2xl border border-[#b8ccda] px-4 py-3 text-sm font-bold text-[#2f6690] transition hover:bg-[#f0f6f9]"
            onClick={addTask}
            type="button"
          >
            + 계획 더 추가하기
          </button>
        </section>

        <button
          className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={draftTasks.length < 3}
          type="submit"
        >
          계획 저장하기
        </button>
        <button className="w-full py-2 text-sm font-semibold text-[#718096]" onClick={onCancel} type="button">
          취소하고 돌아가기
        </button>
      </form>
    </div>
  );
}
