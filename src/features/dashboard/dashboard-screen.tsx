import { mockDashboard } from "@/lib/mock-data";
import { StatusPill } from "@/components/ui";

const stats = [
  { label: "출석일", value: `${mockDashboard.attendanceDays}일`, note: "이번 주" },
  { label: "계획 체류", value: "17시간", note: "예정 기준" },
  { label: "실제 체류", value: "16시간 15분", note: "출결 기록 기준" },
  { label: "과업 완료율", value: `${mockDashboard.completionRate}%`, note: "핵심 과업" },
];

export function DashboardScreen() {
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

      <section className="rounded-3xl bg-[#243b53] p-5 text-white">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">과업 완료 흐름</h2>
          <span className="text-sm text-[#c8d8e6]">78%</span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#46627b]">
          <div className="h-full w-[78%] rounded-full bg-[#f5c36b]" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#dbe7f0]">계획한 과업을 꾸준히 확인하고 있어요.</p>
      </section>

      <section className="rounded-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#334e68]">Recovery</h2>
          <StatusPill tone="amber">진행 중 1건</StatusPill>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#718096]">
          미완료 과업도 기록으로 남아 있어요. 다음 일정에 이어서 마무리하면 됩니다.
        </p>
      </section>
    </div>
  );
}
