"use client";

import { WeatherHint } from "@/components/weather-hint";
import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

type Props = {
  draft: Draft;
  patch: WizardPatch;
  saveBasics: () => void;
  goBack: () => void;
};

export function StepBasics({ draft, patch, saveBasics, goBack }: Props) {
  return (
    <>
<form
    className="flex flex-col gap-3"
    onSubmit={(event) => {
      event.preventDefault();
      saveBasics();
    }}
  >
    <p className="text-sm leading-6">地點來自上一頁的地圖，這裡還能改。</p>
    <label className="wire-field">
      國家
      <input data-testid="field-country" value={draft.country} onChange={(event) => patch({ country: event.target.value })} required />
    </label>
    <label className="wire-field">
      城市
      <input data-testid="field-city" value={draft.city} onChange={(event) => patch({ city: event.target.value })} required />
    </label>
    <label className="wire-field">
      天數
      <input data-testid="field-days" inputMode="numeric" value={draft.days} onChange={(event) => patch({ days: event.target.value })} required />
    </label>
    <label className="wire-field">
      出發日
      <input
        data-testid="field-start"
        type="date"
        value={draft.startDate}
        onChange={(event) => patch({ startDate: event.target.value })}
        required
      />
    </label>
    <label className="wire-field">
      目的（選填）
      <input data-testid="field-purpose" value={draft.purpose} onChange={(event) => patch({ purpose: event.target.value })} />
    </label>
    <WeatherHint
      country={draft.country}
      city={draft.city}
      startDate={draft.startDate}
      days={draft.days}
      onClimate={(climate) => patch({ weatherClimate: climate })}
    />
    <button type="button" className="wire-btn" data-testid="wizard-back" onClick={goBack}>
      上一步
    </button>
    <button type="submit" className="wire-btn wire-btn-primary">下一步：包包</button>
  </form>    </>
  );
}
