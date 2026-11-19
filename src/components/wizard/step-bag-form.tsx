"use client";

import { bagLabel } from "@/components/ui";
import { BAG_TYPES } from "@/lib/constants";
import type { BagType } from "@/lib/types";
import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

type Props = {
  draft: Draft;
  patch: WizardPatch;
  saveBag: () => void;
};

export function StepBagForm({ draft, patch, saveBag }: Props) {
  return (
    <>
<form
    className="flex flex-col gap-3"
    onSubmit={(event) => {
      event.preventDefault();
      saveBag();
    }}
  >
    <label className="wire-field">
      類型
      <select
        value={draft.bagType}
        onChange={(event) => {
          const bagType = event.target.value as BagType;
          patch({
            bagType,
            bagName: draft.editingBagId ? draft.bagName : bagLabel(bagType),
          });
        }}
      >
        {BAG_TYPES.map((type) => (
          <option key={type.id} value={type.id}>
            {type.label}
          </option>
        ))}
      </select>
    </label>
    <label className="wire-field">
      名稱
      <input data-testid="field-bag-name" value={draft.bagName} onChange={(event) => patch({ bagName: event.target.value })} required />
    </label>
    <button type="submit" data-testid="save-bag" className="wire-btn wire-btn-primary">
      儲存包包
    </button>
    <button type="button" className="wire-btn" onClick={() => patch({ step: "bags", error: "" })}>
      返回包包列表
    </button>
  </form>    </>
  );
}
