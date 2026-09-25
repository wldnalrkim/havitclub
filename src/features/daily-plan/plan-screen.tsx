import { useState } from "react";
import { mockPlan } from "@/lib/mock-data";

export function PlanScreen({ onSaved }: { onSaved: () => void }) {
  const [leaveTime, setLeaveTime] = useState(mockPlan.plannedCheckOutTime);
  const [saved, setSaved] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-[#718096]">오늘 계획</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#243b53]">오늘 할 일을 골라요</h1>
        <p className="mt-2 text-sm leading-6 text-[#718096]">가장 중요한 일 3개만 정하면 충분해요.</p>
      </div>

      {saved && (
        <div className="rounded-2xl border border-[#b8e0ca] bg-[#effaf3] p-4 text-sm font-semibold text-[#24734d]" role="status">
          오늘 계획을 저장했어요. 실행할 준비가 되었습니다.
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <section className="rounded-3xl bg-white p-5">
          <label className="text-sm font-bold text-[#334e68]" htmlFor="leave-time">
            오늘 예정 하원시간 <span className="font-normal text-[#9aa8b5]">(필요할 때만 수정)</span>
          </label>
          <input
            className="mt-3 w-full rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-4 py-3 text-lg font-semibold text-[#243b53] outline-none transition focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
            id="leave-time"
            onChange={(event) => setLeaveTime(event.target.value)}
            type="time"
            value={leaveTime}
          />
          <p className="mt-2 text-xs leading-5 text-[#8a98a8]">기본 예정시간은 사전 계획을 기준으로 보여드려요.</p>
        </section>

        <section className="rounded-3xl bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#334e68]">핵심 과업</h2>
              <p className="mt-1 text-xs text-[#8a98a8]">최대 3개 · 이미 정한 과업을 바꿔도 괜찮아요</p>
            </div>
            <span className="rounded-full bg-[#eef4f7] px-3 py-1 text-xs font-bold text-[#5d778b]">3 / 3</span>
          </div>
          <div className="mt-4 space-y-3">
            {mockPlan.tasks.map((task) => (
              <div className="rounded-2xl border border-[#e4ebef] p-3" key={task.id}>
                <input
                  aria-label={`${task.subject} 과업`}
                  className="w-full border-0 bg-transparent text-sm font-semibold text-[#334e68] outline-none placeholder:text-[#a9b5bf]"
                  defaultValue={task.title}
                  required
                />
                <span className="mt-2 inline-block text-xs text-[#8a98a8]">{task.subject}</span>
              </div>
            ))}
          </div>
        </section>

        <button className="w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576]" type="submit">
          계획 저장하기
        </button>
        <button className="w-full py-2 text-sm font-semibold text-[#718096]" onClick={onSaved} type="button">
          취소하고 돌아가기
        </button>
      </form>
    </div>
  );
}
