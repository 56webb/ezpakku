"use client";

import { LUGGAGE_PLANS, TRAVEL_TYPES } from "@/lib/rules/generator";
import { tripPresets, type TripPreset } from "@/lib/trip-presets";
import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

type Props = {
  draft: Draft;
  patch: WizardPatch;
  applyGenerated: () => void;
  applyPreset: (preset: TripPreset) => void;
  goBack: () => void;
};

export function StepPreset({ draft, patch, applyGenerated, applyPreset, goBack }: Props) {
  return (
    <>

    <p className="text-sm leading-6">
      依目的地氣候、天數與旅行類型自動產生包包與物品。產生後還可以再加、再改。
    </p>
    <fieldset className="wire-card flex flex-col gap-2">
      <legend className="px-1 text-sm font-bold">旅行類型（可複選）</legend>
      <div className="flex flex-wrap gap-2">
        {TRAVEL_TYPES.map((type) => {
          const pressed = draft.travelTypes.includes(type.id);
          return (
            <button
              key={type.id}
              type="button"
              className={`wire-btn ${pressed ? "wire-btn-primary" : ""}`}
              aria-pressed={pressed}
              onClick={() => {
                const travelTypes = pressed
                  ? draft.travelTypes.filter((entry) => entry !== type.id)
                  : [...draft.travelTypes, type.id];
                patch({ travelTypes, error: "" });
              }}
            >
              {type.label}
            </button>
          );
        })}
      </div>
    </fieldset>
    <fieldset className="wire-card flex flex-col gap-2">
      <legend className="px-1 text-sm font-bold">行李方案</legend>
      {LUGGAGE_PLANS.map((plan) => (
        <button
          key={plan.id}
          type="button"
          className={`wire-btn ${draft.luggage === plan.id ? "wire-btn-primary" : ""}`}
          aria-pressed={draft.luggage === plan.id}
          onClick={() => patch({ luggage: plan.id, error: "" })}
        >
          {plan.label}
        </button>
      ))}
    </fieldset>
    <button type="button" className="wire-btn" data-testid="wizard-back" onClick={goBack}>
      上一步
    </button>
    <button type="button" data-testid="generate-template" className="wire-btn wire-btn-primary" onClick={applyGenerated}>
      產生清單
    </button>
    {tripPresets.length > 0 && (
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold">或選你自己存的行程</p>
        {tripPresets.map((preset) => (
          <button key={preset.id} type="button" className="wire-btn" onClick={() => applyPreset(preset)}>
            {preset.name}
            <span className="mt-1 block text-xs font-normal">{preset.summary}</span>
          </button>
        ))}
      </div>
    )}
      </>
  );
}
