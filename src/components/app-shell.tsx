"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
import { LoginScreen } from "@/features/auth/login-screen";
import { CheckoutScreen } from "@/features/checkout/checkout-screen";
import { DailyCommitmentScreen } from "@/features/daily-commitment/daily-commitment-screen";
import { TodayScreen } from "@/features/today/today-screen";
import { WeeklyScheduleScreen } from "@/features/weekly-schedule/weekly-schedule-screen";
import {
  getDailyCommitment,
  getDailyCommitmentHistory,
  getRecoveries,
  saveDailyCheckout,
  type DailyCommitmentView,
} from "@/features/daily-commitment/daily-commitment-api";
import { toDailyRecords, toTasks } from "@/features/daily-commitment/daily-commitment-records";
import { getTodaySeoulDate, type CheckoutTaskResult } from "@/domain/daily-commitment/daily-commitment";
import type { Recovery } from "@/domain/recovery/recovery";
import { LoadingState, Logo } from "@/components/ui";
import { DevDateToolbar } from "@/components/dev-date-toolbar";
import {
  getCurrentStudent,
  loginWithStudentCode,
  logoutCurrentStudent,
} from "@/features/auth/auth-api";
import type { DailyRecord, Screen, TaskStatus } from "@/lib/mock-data";
import { getMonthCalendar, getWeekDates, isCheckedOut } from "@/lib/progress";
import { getClientOperationalDate } from "@/lib/dev-date";

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
  viewBox: "0 0 24 24",
  className: "h-5 w-5",
  "aria-hidden": true,
};

const navItems: { label: string; screen: Screen; icon: ReactNode }[] = [
  {
    label: "오늘",
    screen: "today",
    icon: <svg {...iconProps}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1Z" /></svg>,
  },
  {
    label: "계획",
    screen: "plan",
    icon: <svg {...iconProps}><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" /></svg>,
  },
  {
    label: "주간",
    screen: "weekly-schedule",
    icon: <svg {...iconProps}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></svg>,
  },
  {
    label: "체크아웃",
    screen: "checkout",
    icon: <svg {...iconProps}><path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 16l4-4-4-4M14 12H4" /></svg>,
  },
  {
    label: "내 현황",
    screen: "dashboard",
    icon: <svg {...iconProps}><path d="M4 20h16" /><path d="M7 16v-5M12 16V7M17 16v-8" /></svg>,
  },
];

type DailyState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; commitment: DailyCommitmentView | null; plannedCheckOutTime: string };

type RecoveryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; recoveries: Recovery[] };

type HistoryState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; records: DailyRecord[] };

function getHistoryRange(date: string) {
  const weekDates = getWeekDates(date);
  const monthDates = getMonthCalendar(date).dates;
  const from = weekDates[0] < monthDates[0] ? weekDates[0] : monthDates[0];
  const lastWeekDate = weekDates[weekDates.length - 1];
  const lastMonthDate = monthDates[monthDates.length - 1];
  return { from, to: lastWeekDate > lastMonthDate ? lastWeekDate : lastMonthDate };
}

function getErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
    return data.message;
  }
  return fallback;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3 rounded-3xl bg-white p-5" role="alert">
      <p className="text-sm font-medium text-[#b45353]">{message}</p>
      <button className="rounded-2xl border border-[#b8ccda] px-4 py-3 text-sm font-bold text-[#2f6690]" onClick={onRetry} type="button">
        다시 불러오기
      </button>
    </div>
  );
}

export function AppShell() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [screen, setScreen] = useState<Screen>("today");
  const [today, setToday] = useState(() => getTodaySeoulDate());
  const [daily, setDaily] = useState<DailyState>({ status: "loading" });
  const [history, setHistory] = useState<HistoryState>({ status: "loading" });
  const [recoveries, setRecoveries] = useState<RecoveryState>({ status: "loading" });

  const handleSessionExpired = useCallback(() => {
    setIsLoggedIn(false);
    setStudentName("");
    setScreen("today");
    setDaily({ status: "loading" });
    setHistory({ status: "loading" });
  }, []);

  const refreshDaily = useCallback(async () => {
    const date = getClientOperationalDate() ?? getTodaySeoulDate();
    setToday(date);
    const result = await getDailyCommitment(date);
    if (result.response?.status === 401) {
      handleSessionExpired();
      return;
    }
    if (!result.response?.ok || !result.data.ok) {
      setDaily({ status: "error", message: getErrorMessage(result.data, "오늘 계획을 불러올 수 없습니다.") });
      return;
    }
    setDaily({
      status: "ready",
      commitment: result.data.commitment,
      plannedCheckOutTime: result.data.plannedCheckOut.time ?? "",
    });
  }, [handleSessionExpired]);

  const refreshHistory = useCallback(async () => {
    const date = getClientOperationalDate() ?? getTodaySeoulDate();
    setToday(date);
    setHistory({ status: "loading" });
    const { from, to } = getHistoryRange(date);
    const result = await getDailyCommitmentHistory(from, to);
    if (result.response?.status === 401) {
      handleSessionExpired();
      return;
    }
    if (!result.response?.ok || !result.data.ok) {
      setHistory({ status: "error", message: getErrorMessage(result.data, "학습 기록을 불러올 수 없습니다.") });
      return;
    }
    setHistory({ status: "ready", records: toDailyRecords(result.data.commitments) });
  }, [handleSessionExpired]);

  const refreshRecoveries = useCallback(async () => {
    const result = await getRecoveries();
    if (result.response?.status === 401) {
      handleSessionExpired();
      return;
    }
    if (!result.response?.ok || !result.data.ok) {
      setRecoveries({ status: "error", message: getErrorMessage(result.data, "Recovery를 불러올 수 없습니다.") });
      return;
    }
    setRecoveries({ status: "ready", recoveries: result.data.recoveries });
  }, [handleSessionExpired]);

  useEffect(() => {
    getCurrentStudent().then(async (student) => {
      setToday(getClientOperationalDate() ?? getTodaySeoulDate());
      if (student) {
        setStudentName(student.displayName);
        setIsLoggedIn(true);
        await Promise.all([refreshDaily(), refreshRecoveries()]);
      }
      setIsHydrated(true);
    });
  }, [refreshDaily, refreshRecoveries]);

  useEffect(() => {
    if (isLoggedIn && screen === "dashboard") {
      void refreshHistory();
      void refreshRecoveries();
    }
  }, [isLoggedIn, screen, refreshHistory, refreshRecoveries]);

  function navigate(nextScreen: Screen) {
    setScreen(nextScreen);
    window.scrollTo({ top: 0 });
  }

  async function handleDevDateChanged() {
    const date = getClientOperationalDate() ?? getTodaySeoulDate();
    setToday(date);
    await Promise.all([refreshDaily(), refreshHistory(), refreshRecoveries()]);
  }

  async function handleLogin(studentCode: string) {
    const result = await loginWithStudentCode(studentCode);
    if (!result.ok) {
      return { ok: false, message: result.message };
    }

    setStudentName(result.student.displayName);
    setIsLoggedIn(true);
    await Promise.all([refreshDaily(), refreshRecoveries()]);
    return { ok: true };
  }

  async function handleLogout() {
    await logoutCurrentStudent();
    setIsLogoutConfirmOpen(false);
    handleSessionExpired();
  }

  async function handleCheckout(statuses: Record<string, TaskStatus>, reasons: Record<string, string>) {
    if (daily.status !== "ready" || !daily.commitment) {
      return { ok: false as const, message: "오늘 계획을 먼저 제출해주세요." };
    }
    const results: CheckoutTaskResult[] = daily.commitment.tasks.map((task) => {
      const status = statuses[task.id] as CheckoutTaskResult["status"];
      return { taskId: task.id, status, reason: status === "completed" ? null : reasons[task.id] ?? "" };
    });
    const result = await saveDailyCheckout(daily.commitment.date, results);
    if (result.response?.status === 401) {
      handleSessionExpired();
      return { ok: false as const, message: "세션이 만료되었습니다. 다시 로그인해주세요." };
    }
    if (!result.response?.ok || !result.data.ok) {
      return { ok: false as const, message: getErrorMessage(result.data, "체크아웃을 저장할 수 없습니다.") };
    }
    setDaily({ ...daily, commitment: result.data.commitment });
    await refreshRecoveries();
    return { ok: true as const, recoveries: [] };
  }

  if (!isHydrated) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f7f8] text-sm text-[#718096]">불러오는 중...</div>;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const todayTasks = daily.status === "ready" ? toTasks(daily.commitment) : [];
  const plannedCheckOutTime = daily.status === "ready" ? daily.plannedCheckOutTime : "";

  function renderDailyScreen(content: ReactNode) {
    if (daily.status === "loading") return <LoadingState />;
    if (daily.status === "error") {
      return <LoadError message={daily.message} onRetry={() => void refreshDaily()} />;
    }
    return content;
  }

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <header className="border-b border-[#e5ebef] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo />
          <button
            className="-mr-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#6b7b8c] transition hover:bg-[#f4f7f8]"
            onClick={() => setIsLogoutConfirmOpen(true)}
          >
            로그아웃
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-6">
        {process.env.NEXT_PUBLIC_APP_ENV !== "production" && (
          <DevDateToolbar currentDate={today} onChanged={() => void handleDevDateChanged()} />
        )}
        {screen === "today" && renderDailyScreen(
          <TodayScreen
            carryOverCount={0}
            currentDate={today}
            isCheckedOut={isCheckedOut(todayTasks)}
            onNavigate={navigate}
            plannedCheckOutTime={plannedCheckOutTime}
            recoveries={[]}
            studentName={studentName}
            tasks={todayTasks}
          />,
        )}
        {screen === "plan" && (
          <DailyCommitmentScreen
            key={today}
            onSessionExpired={handleSessionExpired}
            onSaved={() => void refreshDaily()}
            studentName={studentName}
          />
        )}
        {screen === "weekly-schedule" && (
          <WeeklyScheduleScreen onSessionExpired={handleSessionExpired} />
        )}
        {screen === "checkout" && renderDailyScreen(
          <CheckoutScreen
            key={today}
            onDone={() => navigate("today")}
            onSubmitted={handleCheckout}
            tasks={todayTasks}
          />,
        )}
        {screen === "dashboard" && (
          history.status === "loading" ? <LoadingState /> :
          history.status === "error" ? <LoadError message={history.message} onRetry={() => void refreshHistory()} /> :
          <DashboardScreen
            currentDate={today}
            onRetryRecoveries={() => void refreshRecoveries()}
            records={history.records}
            recoveries={recoveries.status === "ready" ? recoveries.recoveries : []}
            recoveryStatus={recoveries.status === "error" ? { error: recoveries.message } : recoveries.status}
          />
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[#e5ebef] bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around">
          {navItems.map((item) => (
            <button
              aria-current={screen === item.screen ? "page" : undefined}
              className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold transition ${
                screen === item.screen ? "bg-[#e7f0f8] text-[#2f6690]" : "text-[#6b7b8c] hover:text-[#2f6690]"
              }`}
              key={item.screen}
              onClick={() => navigate(item.screen)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {isLogoutConfirmOpen && (
        <div
          aria-labelledby="logout-title"
          aria-modal="true"
          className="fixed inset-0 z-20 flex items-end justify-center bg-[#243b53]/40 px-4 pb-6 sm:items-center"
          role="dialog"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-[#243b53]" id="logout-title">로그아웃할까요?</h2>
            <p className="mt-2 text-sm leading-6 text-[#607080]">
              현재 로그인한 학생의 세션을 종료합니다.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-2xl border border-[#d9e2e9] px-4 py-3.5 text-sm font-bold text-[#607080]"
                onClick={() => setIsLogoutConfirmOpen(false)}
              >
                취소
              </button>
              <button
                className="flex-1 rounded-2xl bg-[#c55353] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#b04545]"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
