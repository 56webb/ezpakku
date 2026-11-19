"use client";

import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

type Props = {
  draft: Draft;
  patch: WizardPatch;
  finish: () => void;
  goBack: () => void;
};

export function StepName({ draft, patch, finish, goBack }: Props) {
  return (
    <>
<form
    className="flex flex-col gap-3"
    onSubmit={(event) => {
      event.preventDefault();
      finish();
    }}
  >
    <label className="wire-field">
      清單名稱
      <input data-testid="field-list-name" value={draft.name} onChange={(event) => patch({ name: event.target.value })} required />
    </label>
    <button type="button" className="wire-btn" data-testid="wizard-back" onClick={goBack}>
      上一步
    </button>
    <button type="submit" data-testid="finish-list" className="wire-btn wire-btn-primary">
      完成，回到主頁
    </button>
  </form>    </>
  );
}
