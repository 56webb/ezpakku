"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LOGIN_DISCLAIMER, OAUTH_FLAG } from "@/lib/constants";
import { DEMO_USERS } from "@/lib/domain";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useStore } from "@/lib/store";
import { ErrorText, Phone } from "@/components/ui";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function LoginScreen() {
  const store = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [error, setError] = useState("");
  const googleReady = isSupabaseConfigured();

  useEffect(() => {
    if (store.user) router.replace(next);
  }, [store.user, next, router]);

  async function signInWithGoogle() {
    setError("");
    sessionStorage.setItem(OAUTH_FLAG, "1");
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (authError) {
      sessionStorage.removeItem(OAUTH_FLAG);
      setError("Google 登入沒有開始。請確認 Google Cloud 與 Supabase 的 OAuth 設定已完成。");
    }
  }

  return (
    <Phone>
      <main className="flex min-h-full flex-col justify-between gap-6 p-5">
        <div className="flex flex-col gap-4">
          <p className="brand-mark">EZpakku</p>
          <h1 className="text-[2rem] font-black leading-tight tracking-tight">EZ pack, EZ go</h1>
          <p className="text-sm leading-6 text-[var(--ink-soft)]">
            為了更好的體驗請使用 Google 帳號登入。清單之後會同步到你的雲端，方便分享與跨裝置。
          </p>
          <p className="rounded-2xl border border-[var(--line)] bg-white p-3 text-sm leading-6 text-[var(--ink-soft)]">
            {LOGIN_DISCLAIMER}
          </p>
          {googleReady ? (
            <button type="button" className="wire-btn wire-btn-primary" onClick={() => void signInWithGoogle()}>
              使用 Google 帳號登入
            </button>
          ) : (
            <p className="text-sm leading-6 text-[var(--ink-soft)]">
              雲端連線還沒就緒。先用下面的示範身份走完流程。
            </p>
          )}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold tracking-wide text-[var(--ink-soft)]">本機示範（正式上線後會拿掉）</p>
            {DEMO_USERS.map((user) => (
              <button
                key={user.id}
                type="button"
                data-testid={`login-${user.id}`}
                className="wire-btn"
                onClick={() => {
                  store.signInDemo(user.id);
                  router.replace(next);
                }}
              >
                以{user.name}繼續
              </button>
            ))}
          </div>
          <ErrorText>{error}</ErrorText>
        </div>
        <button type="button" className="text-left text-sm text-[var(--ink-soft)] underline" onClick={store.resetDemo}>
          清除這台裝置的示範資料
        </button>
      </main>
    </Phone>
  );
}
