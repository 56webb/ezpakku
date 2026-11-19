"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  getDraftServerSnapshot,
  getDraftSnapshot,
  subscribeDraft,
  writeDraft,
} from "@/lib/browser-state";
import { POINTS_PER_SLOT } from "@/lib/constants";
import { systemCategories } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Category } from "@/lib/types";
import { BottomNav, ErrorText, Phone } from "@/components/ui";
import { addWornBag, removeBag, saveBag } from "@/components/wizard/bag-actions";
import { emptyDraft, stepTitle, type Draft } from "@/components/wizard/draft";
import {
  abandonWizard,
  applyGenerated,
  applyPreset,
  finish,
  goBack,
  lockMode,
  saveBasics,
  saveMap,
} from "@/components/wizard/flow-actions";
import { addCategory, hideCategory, moveCategory } from "@/components/wizard/category-actions";
import {
  addCustom,
  assignBag,
  goItems,
  toggleItem,
} from "@/components/wizard/item-actions";
import { StepBagForm } from "@/components/wizard/step-bag-form";
import { StepBags } from "@/components/wizard/step-bags";
import { StepBasics } from "@/components/wizard/step-basics";
import { StepItems } from "@/components/wizard/step-items";
import { StepMap } from "@/components/wizard/step-map";
import { StepMode } from "@/components/wizard/step-mode";
import { StepName } from "@/components/wizard/step-name";
import { StepPreset } from "@/components/wizard/step-preset";

export function WizardScreen() {
  const store = useStore();
  const router = useRouter();
  const [blockError, setBlockError] = useState("");
  const storedDraft = useSyncExternalStore(subscribeDraft, getDraftSnapshot, getDraftServerSnapshot);
  const draft = useMemo(() => ({ ...emptyDraft(), ...(storedDraft ?? {}) }) as Draft, [storedDraft]);

  const categories = useMemo(
    () =>
      draft.categoryOrder
        .map((id) => [...systemCategories, ...draft.customCategories].find((category) => category.id === id))
        .filter((category): category is Category => Boolean(category))
        .filter((category) => !draft.hiddenCategoryIds.includes(category.id)),
    [draft.categoryOrder, draft.customCategories, draft.hiddenCategoryIds],
  );

  if (!store.user || !store.quote) return null;
  if (!store.quote.allowed) {
    return (
      <Phone footer={<BottomNav />}>
        <main className="flex flex-col gap-3 p-4">
          <h1 className="text-xl font-black">旅程欄位已滿</h1>
          <p className="text-sm leading-6">
            欄位滿了就不能再建。{POINTS_PER_SLOT} 點可以永久再加一格，刪掉清單也不會把這一格收回。
          </p>
          <button
            type="button"
            className="wire-btn wire-btn-primary"
            onClick={() => {
              const result = store.buySlot();
              setBlockError(result.ok ? "" : result.reason);
            }}
          >
            用 {POINTS_PER_SLOT} 點永久加一格
          </button>
          <button type="button" data-testid="grant-points" className="wire-btn" onClick={store.grantDemoPoints}>
            線框暫代購買：加 {POINTS_PER_SLOT} 點
          </button>
          <ErrorText>{blockError}</ErrorText>
        </main>
      </Phone>
    );
  }

  function patch(partial: Partial<Draft>) {
    writeDraft({ ...draft, ...partial });
  }

  const flow = {
    draft,
    patch,
    categories,
    userId: store.user?.id,
    commit: store.commit,
    routerPush: (href: string) => router.push(href),
  };
  const bags = { draft, patch };
  const items = { draft, patch, categories, userId: store.user?.id };

  const quoteText = `這次會佔用一個旅程欄位，完成後還剩 ${Math.max(0, store.quote.openSlots - 1)} 格。點數只用來永久加欄位，建立本身不扣點。`;

  return (
    <Phone
      fill={draft.step === "map"}
      header={
        <header className="flex items-center justify-between gap-3 border-b-2 border-black px-4 py-3">
          <h1 className="text-lg font-black">{stepTitle(draft.step)}</h1>
          <button type="button" className="text-sm underline" onClick={() => abandonWizard(flow)}>
            放棄
          </button>
        </header>
      }
    >
      <main
        className={draft.step === "map" ? "map-screen" : "flex flex-col gap-3 p-4"}
        style={draft.step === "map" ? { position: "relative", height: "100%" } : undefined}
      >
        {draft.step !== "map" && (
          <>
            <p className="text-xs leading-5">{quoteText}</p>
            {draft.modeLocked && draft.mode && (
              <p className="text-xs font-bold">模式：{draft.mode === "detail" ? "細節控" : "通用範本"}，不能改</p>
            )}
            <ErrorText>{draft.error}</ErrorText>
          </>
        )}
        {draft.step === "mode" && (
          <StepMode draft={draft} patch={patch} lockMode={() => lockMode(flow)} />
        )}
        {draft.step === "map" && (
          <StepMap
            draft={draft}
            patch={patch}
            saveMap={() => saveMap(flow)}
            goBack={() => goBack(flow)}
          />
        )}
        {draft.step === "basics" && (
          <StepBasics
            draft={draft}
            patch={patch}
            saveBasics={() => saveBasics(flow)}
            goBack={() => goBack(flow)}
          />
        )}
        {draft.step === "preset" && (
          <StepPreset
            draft={draft}
            patch={patch}
            applyGenerated={() => applyGenerated(flow)}
            applyPreset={(preset) => applyPreset(flow, preset)}
            goBack={() => goBack(flow)}
          />
        )}
        {draft.step === "bags" && (
          <StepBags
            draft={draft}
            patch={patch}
            addWornBag={() => addWornBag(bags)}
            saveBag={() => saveBag(bags)}
            removeBag={(localId) => removeBag(bags, localId)}
            goItems={() => goItems(items)}
            goBack={() => goBack(flow)}
          />
        )}
        {draft.step === "bag-form" && (
          <StepBagForm draft={draft} patch={patch} saveBag={() => saveBag(bags)} />
        )}
        {draft.step === "items" && (
          <StepItems
            draft={draft}
            patch={patch}
            categories={categories}
            toggleItem={(itemId) => toggleItem(items, itemId)}
            assignBag={(bagLocalId) => assignBag(items, bagLocalId)}
            moveCategory={(categoryId, direction) => moveCategory(items, categoryId, direction)}
            hideCategory={(categoryId) => hideCategory(items, categoryId)}
            addCategory={() => addCategory(items)}
            addCustom={() => addCustom(items)}
            goBack={() => goBack(flow)}
          />
        )}
        {draft.step === "name" && (
          <StepName
            draft={draft}
            patch={patch}
            finish={() => finish(flow)}
            goBack={() => goBack(flow)}
          />
        )}
      </main>
    </Phone>
  );
}
