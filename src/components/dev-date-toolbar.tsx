"use client";

import { useEffect, useState } from "react";
import { addDays } from "@/lib/progress";
import { formatDateLabel } from "@/lib/mock-data";
import { getClientOperationalDate } from "@/lib/dev-date";

export function DevDateToolbar({ currentDate, onChanged }: { currentDate: string; onChanged: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [testDate, setTestDate] = useState(currentDate);

  useEffect(() => {
    setTestDate(getClientOperationalDate() ?? currentDate);
  }, [currentDate]);

  async function move(days: number) {
    setIsSaving(true);
    await fetch("/api/dev/date", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: addDays(testDate, days) }),
    });
    setIsSaving(false);
    setTestDate(addDays(testDate, days));
    onChanged();
  }

  async function reset() {
    setIsSaving(true);
    await fetch("/api/dev/date", { method: "DELETE" });
    setIsSaving(false);
    setTestDate(currentDate);
    onChanged();
  }

  return (
    <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-5 pt-3 text-[11px]">
      <span className="rounded-full border border-dashed border-[#c9d4dd] bg-white/70 px-3 py-1.5 font-semibold text-[#607080]">
        테스트 날짜 · {formatDateLabel(testDate)}
      </span>
      <div className="flex gap-1.5">
        <button className="rounded-full border border-dashed border-[#9bb7c9] px-2.5 py-1.5 font-bold text-[#2f6690] disabled:opacity-50" disabled={isSaving} onClick={() => void move(-1)} type="button">←</button>
        <button className="rounded-full border border-dashed border-[#9bb7c9] px-2.5 py-1.5 font-bold text-[#2f6690] disabled:opacity-50" disabled={isSaving} onClick={() => void move(1)} type="button">→</button>
        <button className="rounded-full border border-dashed border-[#c9d4dd] px-2.5 py-1.5 font-bold text-[#607080] disabled:opacity-50" disabled={isSaving} onClick={() => void reset()} type="button">실제 날짜</button>
      </div>
    </div>
  );
}
