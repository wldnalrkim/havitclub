import { useState } from "react";
import { mockDashboard } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui";

const stats = [
  { label: "출석일", value: `${mockDashboard.attendanceDays}일`, note: "이번 주" },
  { label: "계획 체류", value: "17시간", note: "예정 기준" },
  { label: "실제 체류", value: "16시간 15분", note: "출결 기록 기준" },
  { label: "계획 완료율", value: `${mockDashboard.completionRate}%`, note: "핵심 계획" },
];

type DayRecord = {
  status: "complete" | "recovery" | "empty";
  summary: string;
  detail: string;
};

const dayRecords: Record<number, DayRecord> = {
  21: { status: "complete", summary: "계획 3개 완료", detail: "실제 체류 4시간 20분" },
  22: { status: "complete", summary: "계획 2개 완료", detail: "실제 체류 3시간 50분" },
  23: { status: "recovery", summary: "Recovery 1건", detail: "영어 단어 복습 이어짐" },
  24: { status: "complete", summary: "계획 3개 완료", detail: "실제 체류 4시간 10분" },
  25: { status: "recovery", summary: "Recovery 진행 중", detail: "오늘 체크아웃 기록 기준" },
};

const calendarStatusStyles = {
  complete: "bg-[#e5f4ed] text-[#24734d]",
  recovery: "bg-[#fff1d8] text-[#966319]",
  empty: "bg-[#f7f9fa] text-[#a9b5bf]",
};

export function DashboardScreen() {
  const [selectedDay, setSelectedDay] = useState(25);
  const selectedRecord = dayRecords[selectedDay] ?? {
    status: "empty" as const,
    summary: "기록 없음",
    detail: "아직 남겨진 계획이나 출결 기록이 없어요.",
  };
  const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">내 현황</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">이번 주를 돌아봐요</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">잘한 점을 확인하고 다음 주를 준비해요.</p>
      </div>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#334e68]">이번 주 요약</h2>
          <StatusPill tone="green">좋은 흐름</StatusPill>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div className="rounded-2xl bg-[#f7f9fa] p-4" key={stat.label}>
              <p className="text-xs text-[#8a98a8]">{stat.label}</p>
              <p className="mt-2 text-xl font-bold text-[#243b53]">{stat.value}</p>
              <p className="mt-1 text-xs text-[#8a98a8]">{stat.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#334e68]">9월 기록</h2>
            <p className="mt-1 text-xs text-[#8a98a8]">날짜를 누르면 하루 요약을 볼 수 있어요.</p>
          </div>
          <span className="text-sm font-semibold text-[#718096]">이번 달</span>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#a0acb7]">
          {["월", "화", "수", "목", "금", "토", "일"].map((weekday) => <span key={weekday}>{weekday}</span>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 1 }, (_, index) => <span aria-hidden="true" key={`blank-${index}`} />)}
          {calendarDays.map((day) => {
            const record = dayRecords[day];
            const status = record?.status ?? "empty";
            return (
              <button
                className={`relative grid aspect-square place-items-center rounded-xl text-xs font-semibold transition ${calendarStatusStyles[status]} ${
                  selectedDay === day ? "ring-2 ring-[#5d91b3] ring-offset-1" : "hover:opacity-80"
                }`}
                key={day}
                onClick={() => setSelectedDay(day)}
                type="button"
              >
                {day}
                {record && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current" />}
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-2xl bg-[#f7f9fa] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#334e68]">9월 {selectedDay}일</p>
            <StatusPill tone={selectedRecord.status === "complete" ? "green" : selectedRecord.status === "recovery" ? "amber" : "slate"}>
              {selectedRecord.status === "complete" ? "기록 완료" : selectedRecord.status === "recovery" ? "Recovery" : "기록 없음"}
            </StatusPill>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#607080]">{selectedRecord.summary}</p>
          <p className="mt-1 text-xs text-[#8a98a8]">{selectedRecord.detail}</p>
        </div>
        <div className="mt-4 flex gap-3 text-[11px] text-[#8a98a8]">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#7fc49c]" />계획 기록</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#e4b65f]" />Recovery</span>
        </div>
      </section>

      <section className="rounded-3xl bg-[#243b53] p-5 text-white">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">계획 완료 흐름</h2>
          <span className="text-sm text-[#c8d8e6]">78%</span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#46627b]">
          <div className="h-full w-[78%] rounded-full bg-[#f5c36b]" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#dbe7f0]">계획한 일을 꾸준히 확인하고 있어요.</p>
      </section>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#334e68]">Recovery</h2>
          <StatusPill tone="amber">진행 중 1건</StatusPill>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#718096]">
          미완료 계획도 기록으로 남아 있어요. 다음 일정에 이어서 마무리하면 됩니다.
        </p>
      </section>
    </div>
  );
}
