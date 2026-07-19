"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(false);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.href = "/";
    } else {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[100svh] flex-col px-6 pt-[env(safe-area-inset-top)]">
      {/* Content pinned low — thumb territory */}
      <div className="mt-auto pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <h1 className="font-heading text-6xl leading-none">
          Post<span className="text-accent">.</span>
        </h1>
        <p className="mt-2 text-ink/50">
          {error ? "Nope. Try again." : "You know the word."}
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
          <input
            type="password"
            inputMode="text"
            autoComplete="current-password"
            enterKeyHint="go"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="min-h-tap w-full border-b-2 border-ink/20 bg-transparent py-3 outline-none placeholder:text-ink/30 focus:border-accent"
          />
          <button
            type="submit"
            disabled={!password || busy}
            className="min-h-[56px] w-full bg-ink text-lg font-medium text-paper transition-opacity active:opacity-80 disabled:opacity-30"
          >
            {busy ? "…" : "Enter"}
          </button>
        </form>
      </div>
    </main>
  );
}
