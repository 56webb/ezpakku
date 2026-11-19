"use client";

import { BagStudio } from "@/components/bag-studio";
import { bagLabel } from "@/components/ui";
import { DEFAULT_TRAVELER_ID } from "@/lib/travelers";
import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

type Props = {
  draft: Draft;
  patch: WizardPatch;
  addWornBag: () => void;
  saveBag: () => void;
  removeBag: (localId: string) => void;
  goItems: () => void;
  goBack: () => void;
};

export function StepBags({ draft, patch, addWornBag, saveBag, removeBag, goItems, goBack }: Props) {
  return (
    <>

    <p className="text-sm leading-6">
      {draft.mode === "detail"
        ? "從零開始。選種類，按加號。右邊一開始是空白，加了才會出現名稱和圖示。"
        : "預設行程已在右邊。還可以再加。"}
    </p>
    <BagStudio
      bags={draft.bags}
      bagType={draft.bagType}
      editingBagId={draft.editingBagId}
      travelerId={draft.travelerId || DEFAULT_TRAVELER_ID}
      onSelectType={(bagType) => patch({ bagType, bagName: bagLabel(bagType), error: "" })}
      onAdd={addWornBag}
      onWear={(localId) => {
        const bag = draft.bags.find((entry) => entry.localId === localId);
        if (!bag) return;
        patch({
          editingBagId: localId,
          bagName: bag.name,
          bagType: bag.type,
          bagColor: bag.color,
          error: "",
        });
      }}
      onSelectTraveler={(travelerId) => patch({ travelerId, error: "" })}
    />
    {draft.editingBagId && (
      <form
        className="wire-card flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          saveBag();
        }}
      >
        <label className="wire-field">
          名稱
          <input data-testid="field-bag-name" value={draft.bagName} onChange={(event) => patch({ bagName: event.target.value })} required />
        </label>
        <button type="submit" className="wire-btn wire-btn-primary">儲存這個包包</button>
        <button type="button" className="wire-btn" onClick={() => removeBag(draft.editingBagId!)}>
          刪除這個包包
        </button>
      </form>
    )}
    <button type="button" className="wire-btn" data-testid="wizard-back" onClick={goBack}>
      上一步
    </button>
    <button type="button" data-testid="to-items" className="wire-btn wire-btn-primary" onClick={goItems}>
      下一步：物品
    </button>
      </>
  );
}
