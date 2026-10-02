import { useState } from "react";
import { formatDateLabel, type DailyRecord, type Recovery } from "@/lib/mock-data";
import { averageRate, getMonthCalendar, getWeekDates, summarizeRecords, type DaySummary } from "@/lib/progress";
import { CarryOverBadge, StatusPill, SubjectTag, TaskStatusBadge } from "@/components/ui";

const weekdays = ["월", "화", "수", "목", "금", "토", "일"];

type DayTone = "full" | "recovery" | "planned" | "empty";

function getDayTone(summary?: DaySummary): DayTone {
  if (!summary) return "empty";
  if (!summary.isCheckedOut) return "planned";
  return summary.completed === summary.total ? "full" : "recovery";
}

const calendarToneStyles: Record<DayTone, string> = {
  full: "bg-[#e5f4ed] text-[#24734d]",
  recovery: "bg-[#fff1d8] text-[#966319]",
  planned: "bg-[#e7f0f8] text-[#2f6690]",
  empty: "bg-[#f7f9fa] text-[#8796a5]",
};

const dayToneLabels: Record<DayTone, { label: string; tone: "green" | "amber" | "blue" | "slate" }> = {
  full: { label: "모두 완료", tone: "green" },
  recovery: { label: "이어서 할 일 있음", tone: "amber" },
  planned: { label: "체크아웃 전", tone: "blue" },
  empty: { label: "기록 없음", tone: "slate" },
};

function getRateBarColor(rate: number) {
  if (rate >= 80) return "bg-[#7fc49c]";
  if (rate >= 50) return "bg-[#f5c36b]";
  return "bg-[#ef9a9a]";
}

function getWeekFlow(rate: number | null) {
  if (rate === null) return { label: "기록 전", tone: "slate" as const, message: "체크아웃을 마치면 이번 주 흐름이 쌓여요." };
  if (rate >= 80) return { label: "좋은 흐름", tone: "green" as const, message: "계획한 일을 꾸준히 해내고 있어요." };
  if (rate >= 50) return { label: "꾸준히 하는 중", tone: "blue" as const, message: "절반 이상 해냈어요. 남은 일은 다음 계획으로 이어가요." };
  return { label: "계획을 다듬어 봐요", tone: "amber" as const, message: "계획량이 많았는지 돌아보고, 해낼 수 있는 만큼 정해봐요." };
}

export function DashboardScreen({
  currentDate,
  records,
  recoveries,
}: {
  currentDate: string;
  records: DailyRecord[];
  recoveries: Recovery[];
}) {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const summaries = summarizeRecords(records);
  const recordByDate = new Map(records.map((record) => [record.date, record]));

  const weekDates = getWeekDates(currentDate);
  const weekSummaries = weekDates.map((date) => summaries.get(date)).filter((summary): summary is DaySummary => Boolean(summary));
  const weekRate = averageRate(weekSummaries);
  const weekFlow = getWeekFlow(weekRate);
  const openRecoveries = recoveries.filter((recovery) => recovery.status === "open");
  const resolvedRecoveries = recoveries.filter((recovery) => recovery.status === "completed");

  const stats = [
    { label: "계획 제출", value: `${weekSummaries.length}일`, note: "이번 주" },
    { label: "체크아웃", value: `${weekSummaries.filter((summary) => summary.isCheckedOut).length}일`, note: "이번 주" },
    { label: "주간 이행률", value: weekRate === null ? "—" : `${weekRate}%`, note: "체크아웃한 날 평균" },
    { label: "이어서 해낸 계획", value: `${resolvedRecoveries.length}개`, note: "Recovery 완료" },
  ];

  const today = summaries.get(currentDate);
  const calendar = getMonthCalendar(currentDate);
  const selectedRecord = recordByDate.get(selectedDate);
  const selectedTone = getDayTone(summaries.get(selectedDate));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">내 현황</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">나의 학습 흐름을 돌아봐요</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">계획한 일과 실제로 해낸 일을 비교해 봐요.</p>
      </div>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#334e68]">이번 주 요약</h2>
          <StatusPill tone={weekFlow.tone}>{weekFlow.label}</StatusPill>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div className="rounded-2xl bg-[#f7f9fa] p-4" key={stat.label}>
              <p className="text-xs text-[#6b7b8c]">{stat.label}</p>
              <p className="mt-2 text-xl font-bold text-[#243b53]">{stat.value}</p>
              <p className="mt-1 text-xs text-[#6b7b8c]">{stat.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-[#243b53] p-5 text-white">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">요일별 계획 이행</h2>
          <span className="text-sm font-semibold text-[#c8d8e6]">{weekRate === null ? "기록 전" : `평균 ${weekRate}%`}</span>
        </div>
        <div className="mt-5 grid h-36 grid-cols-7 items-end gap-2">
          {weekDates.map((date, index) => {
            const summary = summaries.get(date);
            const isToday = date === currentDate;
            return (
              <div className="flex h-full flex-col items-center justify-end gap-2" key={date}>
                <span className="text-[10px] font-semibold text-[#c8d8e6]">{summary?.rate != null ? `${summary.rate}` : ""}</span>
                <div className="flex w-full flex-1 items-end overflow-hidden rounded-lg bg-[#2f4a63]">
                  {summary?.rate != null ? (
                    <div className={`w-full rounded-lg ${getRateBarColor(summary.rate)}`} style={{ height: `${Math.max(summary.rate, 6)}%` }} />
                  ) : summary ? (
                    <div className="h-[6%] w-full rounded-lg bg-[#5d7a94]" />
                  ) : null}
                </div>
                <span className={`text-xs font-semibold ${isToday ? "text-[#f5c36b]" : "text-[#9fb4c6]"}`}>{weekdays[index]}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm leading-6 text-[#dbe7f0]">{weekFlow.message}</p>
        <p className="mt-1 text-xs text-[#9fb4c6]">완료는 100%, 일부 완료는 절반으로 계산해요.</p>
      </section>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-[#334e68]">오늘의 실행 현황</h2>
            <p className="mt-1 text-xs leading-5 text-[#6b7b8c]">계획한 내용이 실제로 얼마나 이어졌는지 확인해요.</p>
          </div>
          <span className="text-2xl font-bold text-[#2f6690]">{today?.rate != null ? `${today.rate}%` : "—"}</span>
        </div>
        <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#edf1f3]">
          <div className="h-full rounded-full bg-[#7fc49c] transition-all" style={{ width: `${today?.rate ?? 0}%` }} />
        </div>
        {today ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-emerald-50/70 px-2 py-3">
                <p className="text-lg font-bold text-emerald-600">{today.completed}</p>
                <p className="mt-1 text-[11px] text-[#607080]">완료</p>
              </div>
              <div className="rounded-2xl bg-orange-50/70 px-2 py-3">
                <p className="text-lg font-bold text-orange-600">{today.partial}</p>
                <p className="mt-1 text-[11px] text-[#607080]">일부 완료</p>
              </div>
              <div className="rounded-2xl bg-red-50/70 px-2 py-3">
                <p className="text-lg font-bold text-red-600">{today.incomplete}</p>
                <p className="mt-1 text-[11px] text-[#607080]">미완료</p>
              </div>
            </div>
            {!today.isCheckedOut && (
              <p className="mt-4 text-xs leading-5 text-[#6b7b8c]">체크아웃을 마치면 오늘의 계획 이행 결과가 기록돼요.</p>
            )}
          </>
        ) : (
          <p className="mt-4 rounded-2xl bg-[#f7f9fa] p-4 text-sm leading-6 text-[#6b7b8c]">
            오늘 계획을 세우면 나의 학습 과정과 이행 정도를 확인할 수 있어요.
          </p>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5">
        <div>
          <h2 className="font-bold text-[#334e68]">{calendar.month}월 기록</h2>
          <p className="mt-1 text-xs text-[#6b7b8c]">날짜를 누르면 그날 세운 계획과 결과를 볼 수 있어요.</p>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#8796a5]">
          {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: calendar.leadingBlanks }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
          {calendar.dates.map((date) => {
            const tone = getDayTone(summaries.get(date));
            const isFuture = date > currentDate;
            return (
              <button
                aria-label={`${formatDateLabel(date)} ${dayToneLabels[tone].label}`}
                className={`relative grid aspect-square place-items-center rounded-xl text-xs font-semibold transition disabled:opacity-40 ${calendarToneStyles[tone]} ${
                  selectedDate === date ? "ring-2 ring-[#5d91b3] ring-offset-1" : "hover:opacity-80"
                } ${date === currentDate ? "font-extrabold" : ""}`}
                disabled={isFuture}
                key={date}
                onClick={() => setSelectedDate(date)}
                type="button"
              >
                {Number(date.slice(-2))}
                {tone !== "empty" && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#6b7b8c]">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#7fc49c]" />모두 완료</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#e4b65f]" />이어서 할 일 있음</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#7fa8c9]" />체크아웃 전</span>
        </div>

        <div className="mt-4 rounded-2xl bg-[#f7f9fa] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#334e68]">{formatDateLabel(selectedDate)}</p>
            <StatusPill tone={dayToneLabels[selectedTone].tone}>{dayToneLabels[selectedTone].label}</StatusPill>
          </div>
          {selectedRecord ? (
            <div className="mt-3 space-y-2">
              {selectedRecord.tasks.map((task) => (
                <div className="flex items-center gap-2 rounded-xl bg-white p-2.5" key={task.id}>
                  <SubjectTag subject={task.subject} />
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#334e68]">{task.title}</p>
                  {task.recoverySourceTaskId && <CarryOverBadge />}
                  <TaskStatusBadge status={task.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#6b7b8c]">이날은 남겨진 계획이 없어요.</p>
          )}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#334e68]">Recovery</h2>
          <StatusPill tone={openRecoveries.length > 0 ? "amber" : "slate"}>
            {openRecoveries.length > 0 ? `이어서 할 일 ${openRecoveries.length}개` : "남은 일 없음"}
          </StatusPill>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#718096]">
          {openRecoveries.length > 0
            ? `마치지 못한 계획 ${openRecoveries.length}개가 다음 계획을 기다리고 있어요.`
            : "지금은 이어서 할 계획이 없어요."}
          {resolvedRecoveries.length > 0 && ` 지금까지 ${resolvedRecoveries.length}개를 이어서 해냈어요.`}
        </p>
      </section>
    </div>
  );
}
