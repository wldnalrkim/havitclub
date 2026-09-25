import { useState } from "react";
import { Logo } from "@/components/ui";

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [phoneSuffix, setPhoneSuffix] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phoneSuffix.length !== 4) {
      setError("전화번호 뒷자리 4자리를 입력해 주세요.");
      return;
    }
    setError("");
    onLogin();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f8] px-5 py-10">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-[0_20px_50px_rgba(36,59,83,0.1)]">
        <Logo />
        <div className="mt-12">
          <p className="text-sm font-semibold text-[#5d91b3]">학생용 웹</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#243b53]">오늘의 습관을<br />가볍게 시작해요</h1>
          <p className="mt-4 text-sm leading-6 text-[#718096]">학원에서 사용하는 전화번호 뒷자리로 학생 정보를 찾아요.</p>
        </div>

        <form className="mt-8" onSubmit={handleSubmit}>
          <label className="text-sm font-bold text-[#334e68]" htmlFor="phone-suffix">전화번호 뒷자리</label>
          <div className="mt-3 flex items-center rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-4 focus-within:border-[#5d91b3] focus-within:ring-4 focus-within:ring-[#e7f0f8]">
            <input
              autoComplete="off"
              className="w-full bg-transparent py-4 text-lg tracking-[0.4em] text-[#243b53] outline-none"
              id="phone-suffix"
              inputMode="numeric"
              maxLength={4}
              onChange={(event) => setPhoneSuffix(event.target.value.replace(/\D/g, ""))}
              placeholder="0000"
              value={phoneSuffix}
            />
            <span className="text-xl text-[#a9b5bf]">⌕</span>
          </div>
          {error && <p className="mt-2 text-sm font-medium text-[#b45353]" role="alert">{error}</p>}
          <p className="mt-3 text-xs leading-5 text-[#8a98a8]">이 값은 학생 후보를 찾는 데만 사용되며, 추가 인증 후에 이용할 수 있어요.</p>
          <button className="mt-6 w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576]" type="submit">
            시작하기
          </button>
        </form>
      </section>
    </main>
  );
}
