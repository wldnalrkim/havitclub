"use client";

import { useEffect, useState, type ReactNode } from "react";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
import { LoginScreen } from "@/features/auth/login-screen";
import { CheckoutScreen } from "@/features/checkout/checkout-screen";
import { PlanScreen } from "@/features/daily-plan/plan-screen";
import { NextPlanScreen } from "@/features/recovery/next-plan-screen";
import { TodayScreen } from "@/features/today/today-screen";
import { Logo } from "@/components/ui";
import { studentService } from "@/services/student-service";
import { mockPlan, type Screen, type TaskStatus } from "@/lib/mock-data";
import { createCarryOverTasks, getCarryOverRecoveries, isCheckedOut } from "@/lib/progress";
import { MockDevToolbar } from "@/mock/mock-dev-toolbar";

type StudentState = ReturnType<typeof studentService.getState>;

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

export function AppShell() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [screen, setScreen] = useState<Screen>("today");
  const [state, setState] = useState<StudentState | null>(null);

  useEffect(() => {
    if (studentService.getSession()) {
      setStudentName(studentService.getStudent().name);
      setState(studentService.getState());
      setIsLoggedIn(true);
    }
    setIsHydrated(true);
  }, []);

  function refresh() {
    setState(studentService.getState());
  }

  function navigate(nextScreen: Screen) {
    setScreen(nextScreen);
    window.scrollTo({ top: 0 });
  }

  function handleLogin(phoneSuffix: string, pin: string) {
    const result = studentService.login(phoneSuffix, pin);
    if (!result.success) return false;

    setStudentName(studentService.getStudent().name);
    setState(studentService.getState());
    setIsLoggedIn(true);
    return true;
  }

  function handleLogout() {
    studentService.logout();
    setIsLogoutConfirmOpen(false);
    setIsLoggedIn(false);
    setScreen("today");
    setState(null);
  }

  if (!isHydrated) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f7f8] text-sm text-[#718096]">불러오는 중...</div>;
  }

  if (!isLoggedIn || !state) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const planTasks = state.todayPlan?.tasks ?? [];
  const plannedCheckOutTime = state.todayPlan?.plannedCheckOutTime ?? mockPlan.plannedCheckOutTime;
  const checkedOut = isCheckedOut(planTasks);
  const todayRecoveries = state.recoveries.filter(
    (recovery) => recovery.sourceDate === state.currentDate && recovery.status === "open",
  );
  const carryOverCount = getCarryOverRecoveries(state.recoveries, state.currentDate).length;

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
      <MockDevToolbar currentDate={state.currentDate} onChanged={() => { refresh(); navigate("today"); }} />
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-6">
        {screen === "today" && (
          <TodayScreen
            carryOverCount={carryOverCount}
            currentDate={state.currentDate}
            isCheckedOut={checkedOut}
            onNavigate={navigate}
            plannedCheckOutTime={plannedCheckOutTime}
            recoveries={todayRecoveries}
            studentName={studentName}
            tasks={planTasks}
          />
        )}
        {screen === "plan" && (
          <PlanScreen
            carryOverTasks={createCarryOverTasks(state.recoveries, state.currentDate)}
            isInitialPlan={planTasks.length === 0}
            isLocked={checkedOut}
            key={state.currentDate}
            onCancel={() => navigate("today")}
            onSave={(tasks, leaveTime) => {
              setState(studentService.saveTodayPlan(leaveTime, tasks));
              navigate("today");
            }}
            plannedCheckOutTime={plannedCheckOutTime}
            tasks={planTasks}
          />
        )}
        {screen === "checkout" && (
          <CheckoutScreen
            key={state.currentDate}
            onDone={() => navigate("today")}
            onSubmitted={(statuses: Record<string, TaskStatus>, reasons: Record<string, string>) => {
              const nextState = studentService.submitCheckout(planTasks, statuses, reasons);
              setState(nextState);
              return nextState.recoveries.filter(
                (recovery) => recovery.sourceDate === nextState.currentDate && recovery.status === "open",
              );
            }}
            tasks={planTasks}
          />
        )}
        {screen === "dashboard" && <DashboardScreen {...studentService.getDashboardData()} />}
        {screen === "next-plan" && todayRecoveries.length > 0 && (
          <NextPlanScreen onBack={() => navigate("today")} recoveries={todayRecoveries} />
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[#e5ebef] bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around">
          {navItems.map((item) => (
            <button
              aria-current={screen === item.screen ? "page" : undefined}
              className={`flex min-h-12 min-w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
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
            {/* MOCK ONLY: Phase 1-B에서는 로그아웃이 테스트 기록 초기화를 겸합니다. 실제 서비스에서는 이 안내를 제거합니다. */}
            <p className="mt-2 text-sm leading-6 text-[#607080]">
              테스트 모드에서는 로그아웃하면 지금까지 만든 계획과 기록이 모두 초기화돼요.
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
