import { useState, type FormEvent } from "react";
import { Logo } from "@/components/ui";

export function LoginScreen({
  onLogin,
}: {
  onLogin: (studentCode: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [studentCode, setStudentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (studentCode.length !== 4) {
      setError("출결번호 4자리를 입력해 주세요.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const result = await onLogin(studentCode);
    setIsSubmitting(false);
    if (!result.ok) {
      setError(result.message ?? "학생 정보를 확인할 수 없습니다.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f8] px-5 py-10">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-[0_20px_50px_rgba(36,59,83,0.1)]">
        <Logo />
        <div className="mt-12">
          <p className="text-sm font-semibold text-[#5d91b3]">Havit Student</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#243b53]">오늘의 계획을<br />가볍게 시작해요</h1>
          <p className="mt-4 text-sm leading-6 text-[#718096]">
            학생 확인을 위해 출결번호를 입력해 주세요.
          </p>
        </div>

        <form className="mt-8" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-[#334e68]" htmlFor="student-code">출결번호 4자리</label>
            <div className="mt-3 flex items-center rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-4 focus-within:border-[#5d91b3] focus-within:ring-4 focus-within:ring-[#e7f0f8]">
              <input
                autoComplete="off"
                className="w-full bg-transparent py-4 text-lg tracking-[0.4em] text-[#243b53] outline-none"
                id="student-code"
                inputMode="numeric"
                maxLength={4}
                onChange={(event) => { setStudentCode(event.target.value.replace(/\D/g, "")); setError(""); }}
                placeholder="0000"
                value={studentCode}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6b7b8c]">전화번호 뒷자리가 아닌 학생 출결번호를 입력해 주세요.</p>
            {error && <p className="mt-2 text-sm font-medium text-[#b45353]" role="alert">{error}</p>}
            <button className="mt-6 w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? "확인 중..." : "로그인하기"}
            </button>
        </form>
      </section>
    </main>
  );
}
