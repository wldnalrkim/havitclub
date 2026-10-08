"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  createEmptyWeeklyScheduleInput,
  getCurrentWeekStartDate,
  getTodaySeoulDate,
  type PlannedDay,
} from "@/domain/weekly-schedule/weekly-schedule";
import { LoadingState } from "@/components/ui";
import {
  getWeeklySchedule,
  saveWeeklySchedule,
  type WeeklyScheduleClient,
} from "@/features/weekly-schedule/weekly-schedule-api";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00+09:00`));
}

function formatWeekLabel(weekStartDate: string) {
  return `${formatDate(weekStartDate)} ~ ${formatDate(addDays(weekStartDate, 6))}`;
}

function emptyDays(weekStartDate: string) {
  return createEmptyWeeklyScheduleInput(weekStartDate).days;
}

export function WeeklyScheduleScreen({
  onSessionExpired,
}: {
  onSessionExpired: () => void;
}) {
  const initialWeekStart = getCurrentWeekStartDate();
  const [weekStartDate, setWeekStartDate] = useState(initialWeekStart);
  const [days, setDays] = useState<PlannedDay[]>(() => emptyDays(initialWeekStart));
  const [savedSchedule, setSavedSchedule] = useState<WeeklyScheduleClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const currentWeekStart = initialWeekStart;
  const nextWeekStart = addDays(currentWeekStart, 7);
  const isCurrentWeek = weekStartDate === currentWeekStart;
  const isNextWeek = weekStartDate === nextWeekStart;
  const todaySeoulDate = getTodaySeoulDate();

  const isDirty = useMemo(() => {
    if (!savedSchedule) return true;
    return JSON.stringify(days) !== JSON.stringify(savedSchedule.days);
  }, [days, savedSchedule]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      setSuccess("");
      const result = await getWeeklySchedule(weekStartDate);
      if (cancelled) return;

      if (result.response?.status === 401) {
        onSessionExpired();
        return;
      }
      if (!result.response || !result.response.ok || !result.data.ok) {
        setSavedSchedule(null);
        setDays(emptyDays(weekStartDate));
        setError(
          "message" in result.data && result.data.message
            ? result.data.message
            : "주간 계획을 불러올 수 없습니다.",
        );
        setIsLoading(false);
        return;
      }

      setSavedSchedule(result.data.schedule);
      setDays(result.data.schedule?.days ?? emptyDays(weekStartDate));
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [onSessionExpired, weekStartDate]);

  function changeWeek(nextWeekStart: string) {
    setWeekStartDate(nextWeekStart);
  }

  function updateDay(index: number, patch: Partial<PlannedDay>) {
    setSuccess("");
    setError("");
    setDays((current) =>
      current.map((day, dayIndex) =>
        dayIndex === index ? { ...day, ...patch } : day,
      ),
    );
  }

  async function handleSubmit() {
    setIsSaving(true);
    setError("");
    setSuccess("");

    const result = await saveWeeklySchedule({ weekStartDate, days });
    if (result.response?.status === 401) {
      onSessionExpired();
      setIsSaving(false);
      return;
    }
    if (!result.response || !result.response.ok || !result.data.ok) {
      setError(
        "message" in result.data && result.data.message
          ? result.data.message
          : "주간 계획을 저장할 수 없습니다.",
      );
      setIsSaving(false);
      return;
    }

    setSavedSchedule(result.data.schedule);
    setDays(result.data.schedule?.days ?? days);
    setSuccess(result.data.created ? "이번 주 계획을 제출했어요." : "변경사항을 저장했어요.");
    setIsSaving(false);
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">Weekly Schedule</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">주간 등하원 계획</h1>
        <p className="mt-3 text-sm leading-6 text-[#718096]">
          이번 주와 다음 주의 등원 예정일과 시간을 미리 알려주세요.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white p-2">
        <button
          className="rounded-xl px-3 py-2 text-sm font-semibold text-[#607080] disabled:opacity-30"
          disabled={isCurrentWeek}
          onClick={() => changeWeek(currentWeekStart)}
          type="button"
        >
          이번 주
        </button>
        <p className="text-sm font-bold text-[#334e68]">{formatWeekLabel(weekStartDate)}</p>
        <button
          className="rounded-xl px-3 py-2 text-sm font-semibold text-[#2f6690] disabled:opacity-30"
          disabled={isNextWeek}
          onClick={() => changeWeek(nextWeekStart)}
          type="button"
        >
          다음 주
        </button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="space-y-3">
            {days.map((day, index) => {
              const isPastDay = isCurrentWeek && day.date < todaySeoulDate;
              return (
                <article className="rounded-3xl bg-white p-4" key={day.date}>
                  <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#718096]">{formatDate(day.date)}</p>
                    <h2 className="mt-1 text-base font-bold text-[#243b53]">
                      {WEEKDAY_LABELS[index]}요일
                    </h2>
                  </div>
                  {isPastDay && <span className="text-xs font-semibold text-[#9aa9b8]">지난 날짜</span>}
                  <div className="flex rounded-xl bg-[#eef4f7] p-1">
                    <button
                      aria-pressed={day.isPlanned}
                      disabled={isPastDay}
                      className={`rounded-lg px-3 py-2 text-xs font-bold ${
                        day.isPlanned ? "bg-white text-[#2f6690] shadow-sm" : "text-[#718096]"
                      }`}
                      onClick={() => updateDay(index, { isPlanned: true })}
                      type="button"
                    >
                      등원
                    </button>
                    <button
                      aria-pressed={!day.isPlanned}
                      disabled={isPastDay}
                      className={`rounded-lg px-3 py-2 text-xs font-bold ${
                        !day.isPlanned ? "bg-white text-[#2f6690] shadow-sm" : "text-[#718096]"
                      }`}
                      onClick={() =>
                        updateDay(index, {
                          isPlanned: false,
                          plannedArrivalTime: null,
                          plannedDepartureTime: null,
                        })
                      }
                      type="button"
                    >
                      미등원
                    </button>
                  </div>
                  </div>

                  {day.isPlanned && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="text-xs font-bold text-[#607080]">
                      등원 예정
                      <input
                        aria-label={`${WEEKDAY_LABELS[index]}요일 등원 예정시간`}
                        className="mt-2 w-full rounded-xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-base text-[#243b53] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
                        disabled={isPastDay}
                        onChange={(event) =>
                          updateDay(index, { plannedArrivalTime: event.target.value || null })
                        }
                        type="time"
                        value={day.plannedArrivalTime ?? ""}
                      />
                    </label>
                    <label className="text-xs font-bold text-[#607080]">
                      하원 예정
                      <input
                        aria-label={`${WEEKDAY_LABELS[index]}요일 하원 예정시간`}
                        className="mt-2 w-full rounded-xl border border-[#d9e2e9] bg-[#fbfcfd] px-3 py-3 text-base text-[#243b53] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
                        disabled={isPastDay}
                        onChange={(event) =>
                          updateDay(index, { plannedDepartureTime: event.target.value || null })
                        }
                        type="time"
                        value={day.plannedDepartureTime ?? ""}
                      />
                    </label>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-[#b45353]" role="alert">{error}</p>}
          {success && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-[#24734d]" role="status">{success}</p>}

          <button
            className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || !isDirty}
            onClick={() => void handleSubmit()}
            type="button"
          >
            {isSaving ? "저장 중..." : savedSchedule ? "변경사항 저장" : "주간 계획 제출"}
          </button>
        </>
      )}
    </section>
  );
}
