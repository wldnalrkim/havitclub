import type { ReactNode } from "react";
import type { TaskStatus } from "@/lib/mock-data";

const subjectTagStyles: Record<string, string> = {
  국어: "bg-rose-50 text-rose-600",
  수학: "bg-blue-50 text-blue-600",
  영어: "bg-violet-50 text-violet-600",
  사회: "bg-amber-50 text-amber-600",
  과학: "bg-emerald-50 text-emerald-600",
  역사: "bg-orange-50 text-orange-600",
};

export function SubjectTag({ subject }: { subject: string }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${subjectTagStyles[subject] ?? "bg-slate-100 text-slate-600"}`}>
      {subject}
    </span>
  );
}

export const taskStatusLabels: Record<TaskStatus, string> = {
  completed: "완료",
  partial: "일부 완료",
  incomplete: "미완료",
  pending: "확인 전",
};

const taskStatusStyles: Record<TaskStatus, string> = {
  completed: "bg-emerald-50 text-emerald-600",
  partial: "bg-orange-50 text-orange-600",
  incomplete: "bg-red-50 text-red-600",
  pending: "bg-[#eef1f4] text-[#607080]",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${taskStatusStyles[status]}`}>
      {taskStatusLabels[status]}
    </span>
  );
}

export function CarryOverBadge() {
  return (
    <span className="shrink-0 rounded-full bg-[#fff4dc] px-2 py-0.5 text-[11px] font-bold text-[#966319]">↻ 이어서</span>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#243b53] text-lg text-white">
        H
      </span>
      <span className="font-semibold tracking-tight text-[#243b53]">Havit Club</span>
    </div>
  );
}

export function StatusPill({
  children,
  tone = "blue",
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "slate";
}) {
  const styles = {
    blue: "bg-[#e7f0f8] text-[#2f6690]",
    green: "bg-[#e5f4ed] text-[#24734d]",
    amber: "bg-[#fff1d8] text-[#966319]",
    slate: "bg-[#eef1f4] text-[#607080]",
  };

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[tone]}`}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#cbd5df] bg-white p-8 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#f0f5f8] text-xl">✦</div>
      <h3 className="font-semibold text-[#243b53]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#718096]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="space-y-4" aria-label="불러오는 중">
      <div className="h-6 w-40 animate-pulse rounded-lg bg-[#e8edf1]" />
      <div className="h-32 animate-pulse rounded-3xl bg-[#e8edf1]" />
      <div className="h-24 animate-pulse rounded-3xl bg-[#e8edf1]" />
    </div>
  );
}
