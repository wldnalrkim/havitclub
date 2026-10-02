"use client";

import { useEffect, useState } from "react";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
import { LoginScreen } from "@/features/auth/login-screen";
import { CheckoutScreen } from "@/features/checkout/checkout-screen";
import { PlanScreen } from "@/features/daily-plan/plan-screen";
import { NextPlanScreen } from "@/features/recovery/next-plan-screen";
import { TodayScreen } from "@/features/today/today-screen";
import { Logo } from "@/components/ui";
import { studentService } from "@/services/student-service";
import { mockPlan, type Recovery, type Screen, type Task, type TaskStatus } from "@/lib/mock-data";

const navItems: { label: string; screen: Screen; icon: string }[] = [
  { label: "오늘", screen: "today", icon: "⌂" },
  { label: "계획", screen: "plan", icon: "✓" },
  { label: "체크아웃", screen: "checkout", icon: "○" },
  { label: "내 현황", screen: "dashboard", icon: "▥" },
];

export function AppShell() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [screen, setScreen] = useState<Screen>("today");
  const [isLoading, setIsLoading] = useState(false);
  const [planTasks, setPlanTasks] = useState<Task[]>([]);
  const [plannedCheckOutTime, setPlannedCheckOutTime] = useState(mockPlan.plannedCheckOutTime);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);

  useEffect(() => {
    const session = studentService.getSession();

    if (session) {
      const state = studentService.getState();
      setStudentName(studentService.getStudent().name);
      setPlanTasks(state.todayPlan?.tasks ?? []);
      setPlannedCheckOutTime(state.todayPlan?.plannedCheckOutTime ?? mockPlan.plannedCheckOutTime);
      setRecoveries(state.recoveries);
      setIsLoggedIn(true);
    }

    setIsHydrated(true);
  }, []);

  function navigate(nextScreen: Screen) {
    setIsLoading(true);
    window.setTimeout(() => {
      setScreen(nextScreen);
      setIsLoading(false);
    }, 180);
  }

  function handleLogin(phoneSuffix: string, pin: string) {
    const result = studentService.login(phoneSuffix, pin);
    if (!result.success) return false;

    const state = studentService.getState();
    setStudentName(studentService.getStudent().name);
    setPlanTasks(state.todayPlan?.tasks ?? []);
    setPlannedCheckOutTime(state.todayPlan?.plannedCheckOutTime ?? mockPlan.plannedCheckOutTime);
    setRecoveries(state.recoveries);
    setIsLoggedIn(true);
    return true;
  }

  function handleLogout() {
    studentService.logout();
    setIsLoggedIn(false);
    setScreen("today");
    setPlanTasks([]);
    setPlannedCheckOutTime(mockPlan.plannedCheckOutTime);
    setRecoveries([]);
  }

  if (!isHydrated) {
    return <div className="grid min-h-screen place-items-center bg-[#f4f7f8] text-sm text-[#718096]">불러오는 중...</div>;
  }

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#f4f7f8]">
      <header className="border-b border-[#e5ebef] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Logo />
          <button className="text-xs font-semibold text-[#8a98a8]" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-28 pt-7">
        {isLoading ? (
          <div className="space-y-4" aria-label="화면을 불러오는 중">
            <div className="h-7 w-48 animate-pulse rounded-lg bg-[#dfe7ec]" />
            <div className="h-36 animate-pulse rounded-3xl bg-[#dfe7ec]" />
            <div className="h-28 animate-pulse rounded-3xl bg-[#dfe7ec]" />
          </div>
        ) : (
          <>
            {screen === "today" && (
              <TodayScreen
                onNavigate={navigate}
                plannedCheckOutTime={plannedCheckOutTime}
                recoveries={recoveries}
                studentName={studentName}
                tasks={planTasks}
              />
            )}
            {screen === "plan" && (
              <PlanScreen
                onCancel={() => navigate("today")}
                onSave={(tasks, leaveTime) => {
                  const state = studentService.saveTodayPlan(leaveTime, tasks);
                  setPlanTasks(state.todayPlan?.tasks ?? []);
                  setPlannedCheckOutTime(state.todayPlan?.plannedCheckOutTime ?? leaveTime);
                  navigate("today");
                }}
                plannedCheckOutTime={plannedCheckOutTime}
                isInitialPlan={planTasks.length === 0}
                tasks={planTasks}
              />
            )}
            {screen === "checkout" && (
              <CheckoutScreen
                onDone={() => navigate("today")}
                onSubmitted={(statuses: Record<string, TaskStatus>, reasons: Record<string, string>) => {
                  const shouldCreateRecovery = Object.values(statuses).some(
                    (status) => status === "partial" || status === "incomplete",
                  );
                  const state = studentService.submitCheckout(planTasks, statuses, reasons);
                  setRecoveries(state.recoveries);
                  return shouldCreateRecovery
                    ? state.recoveries.filter((recovery) => statuses[recovery.sourceTaskId] === "partial" || statuses[recovery.sourceTaskId] === "incomplete")
                    : [];
                }}
                tasks={planTasks}
              />
            )}
            {screen === "dashboard" && (
              <DashboardScreen
                hasPlan={studentService.getDashboardData().hasPlan}
                recoveries={studentService.getDashboardData().recoveries}
                taskCount={studentService.getDashboardData().taskCount}
              />
            )}
            {screen === "next-plan" && recoveries.length > 0 && (
              <NextPlanScreen onBack={() => navigate("today")} recoveries={recoveries} />
            )}
          </>
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[#e5ebef] bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around">
          {navItems.map((item) => (
            <button
              className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                screen === item.screen ? "bg-[#e7f0f8] text-[#2f6690]" : "text-[#8a98a8] hover:text-[#2f6690]"
              }`}
              key={item.screen}
              onClick={() => navigate(item.screen)}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
