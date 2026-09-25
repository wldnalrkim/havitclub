import { useState } from "react";
import { incompleteReasons, mockPlan, type TaskStatus } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui";

const statusOptions: { label: string; value: TaskStatus }[] = [
  { label: "완료", value: "completed" },
  { label: "일부 완료", value: "partial" },
  { label: "미완료", value: "incomplete" },
];

export function CheckoutScreen({ onDone }: { onDone: () => void }) {
  const [statuses, setStatuses] = useState<Record<string, TaskStatus>>({});
  const [submitted, setSubmitted] = useState(false);

  function updateStatus(taskId: string, status: TaskStatus) {
    setStatuses((current) => ({ ...current, [taskId]: status }));
  }

  if (submitted) {
    return (
      <div className="space-y-5">
        <div className="rounded-3xl bg-[#eaf7ef] p-6 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-2xl text-[#24734d]">✓</div>
          <h1 className="mt-4 text-xl font-bold text-[#24734d]">오늘 기록을 남겼어요</h1>
          <p className="mt-2 text-sm leading-6 text-[#4d8064]">오늘 한 일을 확인하고, 내일을 조금 더 편하게 준비해요.</p>
        </div>
        <div className="rounded-3xl bg-white p-5">
          <StatusPill tone="amber">Recovery 1건 생성됨</StatusPill>
          <p className="mt-3 text-sm font-semibold text-[#334e68]">남은 과업은 다음 일정으로 이어졌어요.</p>
          <p className="mt-1 text-xs leading-5 text-[#8a98a8]">없애지 않고 다음 행동으로 연결해 두었습니다.</p>
        </div>
        <button className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white" onClick={onDone}>
          오늘 화면으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">체크아웃</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">오늘은 어땠나요?</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">완벽하지 않아도 괜찮아요. 실제로 한 일을 남겨주세요.</p>
      </div>

      <div className="space-y-3">
        {mockPlan.tasks.map((task) => {
          const selected = statuses[task.id];
          return (
            <section className="rounded-3xl bg-white p-5" key={task.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[#8a98a8]">{task.subject}</p>
                  <h2 className="mt-1 text-sm font-bold text-[#334e68]">{task.title}</h2>
                </div>
                {selected && <StatusPill tone={selected === "completed" ? "green" : "amber"}>{selected === "completed" ? "완료" : "기록 중"}</StatusPill>}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {statusOptions.map((option) => (
                  <button
                    className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                      selected === option.value
                        ? "border-[#2f6690] bg-[#e7f0f8] text-[#2f6690]"
                        : "border-[#e1e8ed] text-[#718096] hover:border-[#9bb7c9]"
                    }`}
                    key={option.value}
                    onClick={() => updateStatus(task.id, option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {(selected === "partial" || selected === "incomplete") && (
                <select className="mt-3 w-full rounded-xl border border-[#e1e8ed] bg-white px-3 py-3 text-sm text-[#607080]" defaultValue="">
                  <option disabled value="">이유를 선택해 주세요</option>
                  {incompleteReasons.map((reason) => <option key={reason}>{reason}</option>)}
                </select>
              )}
            </section>
          );
        })}
      </div>

      <button
        className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576]"
        onClick={() => setSubmitted(true)}
      >
        오늘 기록 저장하기
      </button>
    </div>
  );
}
