"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BAG_ICONS, BAG_TYPES } from "@/lib/constants";
import { useStore } from "@/lib/store";
import type { BagType } from "@/lib/types";

export function Phone({
  header,
  footer,
  fill = false,
  children,
}: {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="phone-shell">
      {header}
      <div className={fill ? "min-h-0 flex-1 overflow-hidden" : "min-h-0 flex-1 overflow-y-auto"}>{children}</div>
      {footer}
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/items", label: "所有物品", testId: "nav-items" },
    { href: "/new", label: "新建清單", testId: "nav-new" },
    { href: "/site", label: "官網", testId: "nav-site" },
  ];
  return (
    <nav className="grid grid-cols-3 border-t-2 border-black bg-white" aria-label="主要">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-14 items-center justify-center border-r-2 border-black text-sm font-bold last:border-r-0 ${active ? "bg-black text-white" : "bg-white"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BagGlyph({ type, size = 40 }: { type: BagType; size?: number }) {
  const src = BAG_ICONS[type];
  if (src) {
    return <img src={src} alt="" width={size} height={size} className="bag-icon" style={{ width: size, height: size }} />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="bag-icon">
      <rect x="6" y="6" width="28" height="28" rx="6" fill="#fffdf6" stroke="#111" strokeWidth="2" />
      <path d="M20 14v12M14 20h12" fill="none" stroke="#111" strokeWidth="2" />
    </svg>
  );
}

export function bagLabel(type: BagType): string {
  return BAG_TYPES.find((entry) => entry.id === type)?.label ?? "包包";
}

export function BagPicker({
  bags,
  onPick,
}: {
  bags: { id: string; name: string; type: BagType; color: string }[];
  onPick: (bagId: string) => void;
}) {
  return (
    <div role="dialog" aria-label="選擇包包" className="wire-pop">
      <p className="text-sm font-bold">放進哪個包包？必須選一個</p>
      <div className="bag-scroller">
        {bags.map((bag) => (
          <button
            key={bag.id}
            type="button"
            data-testid={`bag-pick-${bag.id}`}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
            onClick={() => onPick(bag.id)}
          >
            <BagGlyph type={bag.type} />
            <span className="w-full truncate text-center text-xs">{bag.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ErrorText({ children }: { children: string }) {
  if (!children) return null;
  return (
    <p data-testid="error" role="alert" className="border-2 border-black bg-white px-3 py-2 text-sm font-bold">
      {children}
    </p>
  );
}

export function RequireUser({ children }: { children: React.ReactNode }) {
  const { ready, user } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || user) return;
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, user, pathname, router]);

  if (!ready) {
    return (
      <Phone>
        <p className="p-4 text-sm">正在讀取這台裝置上的清單</p>
      </Phone>
    );
  }
  if (!user) {
    return (
      <Phone>
        <p className="p-4 text-sm">前往登入</p>
      </Phone>
    );
  }
  return children;
}
