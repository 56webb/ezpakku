import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/login-screen";
import { Phone } from "@/components/ui";

export const instant = false;

export const metadata: Metadata = {
  title: "登入 · EZpakku",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <Phone>
          <p className="p-4 text-sm">正在打開登入</p>
        </Phone>
      }
    >
      <LoginScreen />
    </Suspense>
  );
}
