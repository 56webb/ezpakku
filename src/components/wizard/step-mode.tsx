"use client";

import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

type Props = {
  draft: Draft;
  patch: WizardPatch;
  lockMode: () => void;
};

export function StepMode({ draft, patch, lockMode }: Props) {
  return (
    <>

    {draft.modeLocked ? (
      <>
        <p className="text-sm leading-6">
          已選定「{draft.mode === "detail" ? "細節控" : "通用範本"}」，不能再改模式。
        </p>
        <button
          type="button"
          className="wire-btn wire-btn-primary"
          onClick={() => patch({ step: "map", error: "" })}
        >
          繼續選地點
        </button>
      </>
    ) : (
      <>
        <button
          type="button"
          data-testid="mode-detail"
          aria-pressed={draft.mode === "detail"}
          className={`wire-btn ${draft.mode === "detail" ? "wire-btn-primary" : ""}`}
          onClick={() => patch({ mode: "detail", error: "" })}
        >
          細節控
          <span className="mt-1 block text-sm font-normal">完整自己勾，大約 10 分鐘</span>
        </button>
        <button
          type="button"
          data-testid="mode-template"
          aria-pressed={draft.mode === "template"}
          className={`wire-btn ${draft.mode === "template" ? "wire-btn-primary" : ""}`}
          onClick={() => patch({ mode: "template", error: "" })}
        >
          通用範本
          <span className="mt-1 block text-sm font-normal">依地點和天數產生，大約 1 分鐘，之後還能改</span>
        </button>
        <button type="button" data-testid="mode-lock" className="wire-btn wire-btn-primary" onClick={lockMode}>
          確定使用這個模式
        </button>
        <p className="text-xs">按下去之後不能改成另一種模式。</p>
      </>
    )}
      </>
  );
}
