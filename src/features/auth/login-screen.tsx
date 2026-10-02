import { useState, type FormEvent } from "react";
import { Logo } from "@/components/ui";

export function LoginScreen({ onLogin }: { onLogin: (phoneSuffix: string, pin: string) => boolean }) {
  const [mode, setMode] = useState<"activate" | "login">("login");
  const [step, setStep] = useState<"identify" | "set-pin">("identify");
  const [phoneSuffix, setPhoneSuffix] = useState("");
  const [initialCode, setInitialCode] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirmation, setPinConfirmation] = useState("");
  const [error, setError] = useState("");

  function handleIdentify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phoneSuffix.length !== 4) {
      setError("전화번호 뒷자리 4자리를 입력해 주세요.");
      return;
    }
    if (mode === "activate" && initialCode.length !== 6) {
      setError("코치님에게 받은 초기 코드 6자리를 입력해 주세요.");
      return;
    }
    if (mode === "login" && pin.length !== 6) {
      setError("개인 PIN 6자리를 입력해 주세요.");
      return;
    }
    setError("");
    if (mode === "activate") {
      setStep("set-pin");
    } else {
      if (!onLogin(phoneSuffix, pin)) {
        setError("전화번호 뒷자리 또는 PIN을 확인해주세요.");
      }
    }
  }

  function handlePinSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin.length !== 6) {
      setError("개인 PIN은 6자리로 설정해 주세요.");
      return;
    }
    if (pin !== pinConfirmation) {
      setError("입력한 PIN이 서로 달라요.");
      return;
    }
    setError("");
    if (!onLogin(phoneSuffix, pin)) {
      setError("전화번호 뒷자리 또는 PIN을 확인해주세요.");
      return;
    }
    setError("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f7f8] px-5 py-10">
      <section className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-[0_20px_50px_rgba(36,59,83,0.1)]">
        <Logo />
        <div className="mt-12">
          <p className="text-sm font-semibold text-[#5d91b3]">Havit Student</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#243b53]">오늘의 계획을<br />가볍게 시작해요</h1>
          <p className="mt-4 text-sm leading-6 text-[#718096]">
            {step === "set-pin" ? "앞으로 사용할 개인 PIN을 만들어 주세요." : "학생 확인을 위해 정보를 입력해 주세요."}
          </p>
        </div>

        {step === "set-pin" ? (
          <form className="mt-8" onSubmit={handlePinSetup}>
            <div className="rounded-2xl bg-[#eef4f7] p-4 text-sm leading-6 text-[#607080]">
              다음 로그인부터 사용할 개인 PIN을 설정해 주세요. 
            </div>
            <label className="mt-6 block text-sm font-bold text-[#334e68]" htmlFor="new-pin">개인 PIN 6자리</label>
            <input
              autoComplete="new-password"
              className="mt-3 w-full rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-4 py-4 text-lg tracking-[0.4em] text-[#243b53] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
              id="new-pin"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              type="password"
              value={pin}
            />
            <label className="mt-4 block text-sm font-bold text-[#334e68]" htmlFor="pin-confirmation">개인 PIN 다시 입력</label>
            <input
              autoComplete="new-password"
              className="mt-3 w-full rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-4 py-4 text-lg tracking-[0.4em] text-[#243b53] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
              id="pin-confirmation"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setPinConfirmation(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              type="password"
              value={pinConfirmation}
            />
            {error && <p className="mt-2 text-sm font-medium text-[#b45353]" role="alert">{error}</p>}
            <button className="mt-6 w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white" type="submit">
              PIN 설정하고 시작하기
            </button>
          </form>
        ) : (
          <form className="mt-8" onSubmit={handleIdentify}>
            <div className="flex rounded-2xl bg-[#eef4f7] p-1">
              <button
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold ${mode === "activate" ? "bg-white text-[#2f6690] shadow-sm" : "text-[#718096]"}`}
                onClick={() => { setMode("activate"); setError(""); }}
                type="button"
              >
                처음 이용해요
              </button>
              <button
                className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold ${mode === "login" ? "bg-white text-[#2f6690] shadow-sm" : "text-[#718096]"}`}
                onClick={() => { setMode("login"); setError(""); }}
                type="button"
              >
                PIN이 있어요
              </button>
            </div>
            <label className="mt-6 block text-sm font-bold text-[#334e68]" htmlFor="phone-suffix">전화번호 뒷자리</label>
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
            <label className="mt-4 block text-sm font-bold text-[#334e68]" htmlFor="auth-code">
              {mode === "activate" ? "코치님에게 받은 초기 코드" : "개인 PIN"}
            </label>
            <input
              autoComplete="one-time-code"
              className="mt-3 w-full rounded-2xl border border-[#d9e2e9] bg-[#fbfcfd] px-4 py-4 text-lg tracking-[0.4em] text-[#243b53] outline-none focus:border-[#5d91b3] focus:ring-4 focus:ring-[#e7f0f8]"
              id="auth-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => (mode === "activate" ? setInitialCode(event.target.value.replace(/\D/g, "")) : setPin(event.target.value.replace(/\D/g, "")))}
              placeholder="000000"
              type="password"
              value={mode === "activate" ? initialCode : pin}
            />
            <p className="mt-3 text-xs leading-5 text-[#8a98a8]">
              {mode === "activate" ? "초기 코드는 최초 등록에 한 번만 사용돼요." : "전화번호 뒷자리는 학생 확인용으로만 사용돼요."}
            </p>
            {error && <p className="mt-2 text-sm font-medium text-[#b45353]" role="alert">{error}</p>}
            <button className="mt-6 w-full rounded-2xl bg-[#2f6690] px-4 py-4 text-sm font-bold text-white transition hover:bg-[#255576]" type="submit">
              {mode === "activate" ? "학생 확인하고 PIN 만들기" : "로그인하기"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
