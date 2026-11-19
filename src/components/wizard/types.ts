import type { Draft } from "@/components/wizard/draft";

export type WizardPatch = (partial: Partial<Draft>) => void;
