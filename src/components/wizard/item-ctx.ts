import type { Category } from "@/lib/types";
import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

export type WizardItemCtx = {
  draft: Draft;
  patch: WizardPatch;
  categories: Category[];
  userId: string | null | undefined;
};
