import type { ReactNode } from "react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#243b53] text-lg text-white">
        H
      </span>
      <span className="font-semibold tracking-tight text-[#243b53]">Habit Club</span>
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
