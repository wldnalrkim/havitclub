"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingState, SubjectTag } from "@/components/ui";
import {
  getTodaySeoulDate,
  type StudyTask,
  type DailyCommitmentRevision,
  type PlannedCheckOut,
} from "@/domain/daily-commitment/daily-commitment";
import { subjectOptions, type SubjectOption } from "@/lib/mock-data";
import {
  getDailyCommitment,
  getDailyCommitmentRevisions,
  getPendingRecoveries,
  saveDailyCommitment,
  type DailyCommitmentView,
} from "@/features/daily-commitment/daily-commitment-api";
import type { Recovery } from "@/domain/recovery/recovery";
import { getClientOperationalDate } from "@/lib/dev-date";

function createTask(): StudyTask {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `task-${Date.now()}-${Math.random()}`,
    subject: "",
    description: "",
  };
}

function formatTime(value: string | null) {
  if (!value) return "확인 필요";
  const [hour, minute] = value.split(":");
  return `${hour}:${minute}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
  }).format(new Date(`${value}T00:00:00+09:00`));
}

function isErrorResponse(data: { ok: boolean; message?: string }): data is { ok: false; message?: string } {
  return !data.ok;
}

const selectedSubjectStyles: Record<SubjectOption, string> = {
  국어: "border-rose-200 bg-rose-50 text-rose-600",
  수학: "border-blue-200 bg-blue-50 text-blue-600",
  영어: "border-violet-200 bg-violet-50 text-violet-600",
  사회: "border-amber-200 bg-amber-50 text-amber-600",
  과학: "border-emerald-200 bg-emerald-50 text-emerald-600",
  역사: "border-orange-200 bg-orange-50 text-orange-600",
  기타: "border-slate-200 bg-slate-50 text-slate-600",
};

const idleSubjectStyle = "border-[#d9e2e9] bg-white text-[#607080]";

export function DailyCommitmentScreen({
  onSessionExpired,
  onSaved,
  studentName,
}: {
  onSessionExpired: () => void;
  onSaved: () => void;
  studentName: string;
}) {
  const date = getClientOperationalDate() ?? getTodaySeoulDate();
  const [commitment, setCommitment] = useState<DailyCommitmentView | null>(null);
  const [plannedCheckOut, setPlannedCheckOut] = useState<PlannedCheckOut>({
    time: null,
    isPlanned: false,
    message: null,
  });
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [customSubjects, setCustomSubjects] = useState<Record<string, string>>({});
  const [revisions, setRevisions] = useState<DailyCommitmentRevision[]>([]);
  const [pendingRecoveries, setPendingRecoveries] = useState<Recovery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const result = await getDailyCommitment(date);
    if (result.response?.status === 401) {
      onSessionExpired();
      return;
    }
    if (!result.response || !result.response.ok || isErrorResponse(result.data)) {
      setError(
        isErrorResponse(result.data) && result.data.message
          ? result.data.message
          : "오늘 계획을 불러올 수 없습니다.",
      );
      setIsLoading(false);
      return;
    }
    setCommitment(result.data.commitment);
    const loadedTasks = result.data.commitment?.tasks ?? [createTask()];
    setTasks(loadedTasks);
    setCustomSubjects(
      Object.fromEntries(
        loadedTasks
          .filter((task) => !subjectOptions.includes(task.subject as SubjectOption))
          .map((task) => [task.id, task.subject]),
      ),
    );
    setPlannedCheckOut(result.data.plannedCheckOut);
    const recoveryResult = await getPendingRecoveries();
    if (recoveryResult.response?.ok && recoveryResult.data.ok) {
      setPendingRecoveries(
        recoveryResult.data.recoveries.filter((recovery) => recovery.originalDate < date),
      );
    }
    setIsLoading(false);
  }, [date, onSessionExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateTask(id: string, patch: Partial<StudyTask>) {
    setSuccess("");
    setError("");
    setTasks((current) => current.map((task) => task.id === id ? { ...task, ...patch } : task));
  }

  function selectedSubject(task: StudyTask): SubjectOption | "" {
    if (subjectOptions.includes(task.subject as SubjectOption)) {
      return task.subject as SubjectOption;
    }
    return task.subject || Object.prototype.hasOwnProperty.call(customSubjects, task.id)
      ? "기타"
      : "";
  }

  function selectSubject(task: StudyTask, subject: SubjectOption) {
    if (subject === "기타") {
      setCustomSubjects((current) => ({ ...current, [task.id]: current[task.id] ?? "" }));
      updateTask(task.id, { subject: customSubjects[task.id] ?? "" });
      return;
    }
    setCustomSubjects((current) => {
      const next = { ...current };
      delete next[task.id];
      return next;
    });
    updateTask(task.id, { subject });
  }

  function removeTask(id: string) {
    setSuccess("");
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function addRecovery(recovery: Recovery) {
    if (tasks.some((task) => task.recoveryId === recovery.id)) return;
    setTasks((current) => [
      ...current,
      {
        id: typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `task-${Date.now()}-${Math.random()}`,
        subject: recovery.subject,
        description: recovery.content,
        recoveryId: recovery.id,
      },
    ]);
    setSuccess("");
  }

  async function handleSave() {
    const validTasks = tasks
      .map((task) => ({
        ...task,
        subject: task.subject.trim(),
        description: task.description.trim(),
      }))
      .filter((task) => task.subject || task.description);
    if (
      validTasks.length === 0 ||
      validTasks.some((task) => !task.subject || !task.description)
    ) {
      setError("과목과 구체적인 학습 내용을 하나 이상 입력해주세요.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");
    const result = await saveDailyCommitment({
      date,
      tasks: validTasks,
      expectedVersion: commitment?.version,
      requestId: typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}`,
    });
    if (result.response?.status === 401) {
      onSessionExpired();
      setIsSaving(false);
      return;
    }
    if (!result.response || !result.response.ok || isErrorResponse(result.data)) {
      setError(
        isErrorResponse(result.data) && result.data.message
          ? result.data.message
          : "오늘 계획을 저장할 수 없습니다.",
      );
      setIsSaving(false);
      return;
    }
    setCommitment(result.data.commitment);
    setTasks(result.data.commitment?.tasks ?? validTasks);
    setPlannedCheckOut(result.data.plannedCheckOut);
    setSuccess(result.data.created ? "오늘 계획을 제출했습니다." : "변경사항을 저장했습니다.");
    setPendingRecoveries((current) =>
      current.filter((recovery) => !validTasks.some((task) => task.recoveryId === recovery.id)),
    );
    onSaved();
    setIsSaving(false);
    if (showRevisions) await loadRevisions();
  }

  async function loadRevisions() {
    const result = await getDailyCommitmentRevisions(date);
    if (!result.response || !result.response.ok || isErrorResponse(result.data)) {
      setError(
        isErrorResponse(result.data) && result.data.message
          ? result.data.message
          : "변경 이력을 불러올 수 없습니다.",
      );
      return;
    }
    setRevisions(result.data.revisions);
  }

  async function toggleRevisions() {
    if (!showRevisions) await loadRevisions();
    setShowRevisions((current) => !current);
  }

  const isLocked = Boolean(commitment?.checkout);

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">Daily Commitment</p>
        <p className="mt-2 text-sm text-[#718096]">{formatDate(date)}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">오늘 학습 계획</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">{studentName}님, 오늘 할 일을 구체적으로 정해보세요.</p>
      </div>

      {isLoading ? <LoadingState /> : (
        <>
          <section className="rounded-3xl bg-white p-5">
            <p className="text-xs font-bold text-[#718096]">오늘 예정 하원시간</p>
            <p className="mt-2 text-2xl font-bold text-[#2f6690]">{formatTime(plannedCheckOut.time)}</p>
            <p className="mt-2 text-xs leading-5 text-[#607080]">
              예정 하원시간은 확정된 주간 계획을 기준으로 표시됩니다. 변경이 필요한 경우 담당 코치에게 요청해주세요.
            </p>
            {plannedCheckOut.message && (
              <p className="mt-3 rounded-xl bg-[#fff8e8] px-3 py-2.5 text-sm font-medium text-[#8a6d3b]" role="status">
                {plannedCheckOut.message}
              </p>
            )}
          </section>

          {isLocked ? (
            <section className="rounded-3xl bg-white p-5">
              <h2 className="font-bold text-[#243b53]">오늘의 계획</h2>
              <p className="mt-1 text-xs text-[#718096]">체크아웃을 마친 계획은 수정할 수 없어요. 다음 계획은 내일 새로 세울 수 있어요.</p>
              <div className="mt-4 space-y-3">
                {tasks.map((task, index) => (
                  <div className="flex items-center gap-3 rounded-2xl bg-[#f7f9fa] p-3" key={task.id}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#e7f0f8] text-sm font-bold text-[#2f6690]">
                      {index + 1}
                    </span>
                    <SubjectTag subject={task.subject} />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#334e68]">{task.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-3xl bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[#243b53]">학습 항목</h2>
                  <p className="mt-1 text-xs text-[#718096]">제출 후에도 추가·수정·삭제할 수 있어요.</p>
                </div>
                <span className="rounded-full bg-[#e7f0f8] px-3 py-1 text-xs font-bold text-[#2f6690]">{tasks.length}개</span>
              </div>
              <div className="mt-4 space-y-3">
                {tasks.map((task, index) => (
                  <article className="rounded-2xl border border-[#e4ebef] p-4" key={task.id}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#718096]">학습 {index + 1}</p>
                      <button
                        className="rounded-xl px-2 py-1 text-xs font-semibold text-[#b45353] disabled:opacity-40"
                        disabled={tasks.length === 1}
                        onClick={() => removeTask(task.id)}
                        type="button"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {subjectOptions.map((subject) => (
                        <button
                          className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                            selectedSubject(task) === subject
                              ? selectedSubjectStyles[subject]
                              : idleSubjectStyle
                          }`}
                          key={subject}
                          onClick={() => selectSubject(task, subject)}
                          type="button"
                        >
                          {subject}
                        </button>
                      ))}
                    </div>
                    {selectedSubject(task) === "기타" && (
                      <input
                        aria-label={`${index + 1}번째 과목`}
                        className="mt-2 w-full rounded-xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-sm font-semibold text-[#334e68] outline-none focus:border-[#5d91b3]"
                        onChange={(event) => {
                          setCustomSubjects((current) => ({ ...current, [task.id]: event.target.value }));
                          updateTask(task.id, { subject: event.target.value });
                        }}
                        placeholder="과목명을 입력해주세요"
                        value={customSubjects[task.id] ?? task.subject}
                      />
                    )}
                    <textarea
                      aria-label={`${index + 1}번째 학습 내용`}
                      className="mt-2 min-h-20 w-full rounded-xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-sm text-[#334e68] outline-none focus:border-[#5d91b3]"
                      onChange={(event) => updateTask(task.id, { description: event.target.value })}
                      placeholder="구체적인 학습 내용 예: 미적분 기출 20문제"
                      value={task.description}
                    />
                  </article>
                ))}
              </div>
              <button
                className="mt-4 w-full rounded-2xl border border-[#b8ccda] px-4 py-3 text-sm font-bold text-[#2f6690]"
                onClick={() => setTasks((current) => [...current, createTask()])}
                type="button"
              >
                + 학습 항목 추가
              </button>
            </section>
          )}

          {!isLocked && pendingRecoveries.length > 0 && (
            <section className="rounded-3xl border border-[#f4dcae] bg-[#fffcf5] p-5">
              <h2 className="font-bold text-[#76551e]">이전 미완료 학습</h2>
              <p className="mt-1 text-xs leading-5 text-[#8a6d3b]">오늘 계획에 이어서 할 일을 추가할 수 있어요.</p>
              <div className="mt-3 space-y-2">
                {pendingRecoveries.map((recovery) => (
                  <div className="flex items-center gap-3 rounded-xl bg-white p-3" key={recovery.id}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#334e68]">{recovery.subject} · {recovery.content}</p>
                      <p className="mt-1 text-xs text-[#8a6d3b]">{recovery.originalDate} · {recovery.originalCompletionStatus}</p>
                    </div>
                    <button
                      className="shrink-0 rounded-xl bg-[#f3d58f] px-3 py-2 text-xs font-bold text-[#76551e]"
                      disabled={tasks.some((task) => task.recoveryId === recovery.id)}
                      onClick={() => addRecovery(recovery)}
                      type="button"
                    >
                      {tasks.some((task) => task.recoveryId === recovery.id) ? "추가됨" : "추가"}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-[#b45353]" role="alert">{error}</p>}
          {success && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-[#24734d]" role="status">{success}</p>}

          {commitment && (
            <section className="rounded-2xl border border-[#d9e2e9] bg-[#eef4f7] px-4 py-4 text-sm leading-6 text-[#607080]">
              <p>최초 제출: {new Date(commitment.initialSubmittedAt).toLocaleString("ko-KR")}</p>
              <p>마지막 저장: {new Date(commitment.updatedAt).toLocaleString("ko-KR")}</p>
              <button className="mt-2 font-bold text-[#2f6690]" onClick={() => void toggleRevisions()} type="button">
                {showRevisions ? "변경 이력 닫기" : "변경 이력 보기"}
              </button>
            </section>
          )}

          {showRevisions && (
            <section className="rounded-2xl bg-white p-5">
              <h2 className="font-bold text-[#243b53]">변경 이력</h2>
              {revisions.length === 0 ? (
                <p className="mt-3 text-sm text-[#718096]">아직 변경 이력이 없습니다.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {revisions.map((revision) => (
                      <div className="rounded-xl bg-[#f7f9fa] p-3 text-xs text-[#607080]" key={revision.id}>
                      <p className="font-bold text-[#334e68]">{revision.action} · {revision.taskId}</p>
                      <p className="mt-1">{revision.before?.description ?? "없음"} → {revision.after?.description ?? "삭제됨"}</p>
                      <p className="mt-1">{new Date(revision.changedAt).toLocaleString("ko-KR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {!isLocked && (
            <button
              className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving}
              onClick={() => void handleSave()}
              type="button"
            >
              {isSaving ? "저장 중..." : commitment ? "변경사항 저장" : "오늘 계획 제출"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
