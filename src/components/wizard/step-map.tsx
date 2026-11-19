"use client";

import { DestinationMap } from "@/components/destination-map";
import { ErrorText } from "@/components/ui";
import {
  getPopularCityShortcuts,
  getPopularCountries,
  matchDestinationCountry,
} from "@/lib/destinations";
import type { Draft } from "@/components/wizard/draft";
import type { WizardPatch } from "@/components/wizard/types";

type Props = {
  draft: Draft;
  patch: WizardPatch;
  saveMap: () => void;
  goBack: () => void;
};

export function StepMap({ draft, patch, saveMap, goBack }: Props) {
  return (
    <>

    <DestinationMap
      onPick={(country, city) => patch({ country, city, location: `${country} ${city}`, error: "" })}
    />
    <form
      className="map-sheet"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        border: "2px solid #111111",
        background: "#fffdf6",
        padding: 12,
      }}
      onSubmit={(event) => {
        event.preventDefault();
        saveMap();
      }}
    >
      <p className="text-sm font-bold">
        {draft.country && draft.city ? `${draft.country} · ${draft.city}` : "點圓點選地點，或直接打字"}
      </p>
      <ErrorText>{draft.error}</ErrorText>
      <div className="wire-field">
        <label htmlFor="map-country">國家</label>
        <input
          id="map-country"
          data-testid="field-country"
          value={draft.country}
          onChange={(event) => patch({ country: event.target.value })}
        />
        <div className="destination-picks" role="group" aria-label="常去國家">
          {getPopularCountries().map((country) => (
            <button
              key={country.id}
              type="button"
              className="destination-pick"
              aria-pressed={draft.country === country.name}
              data-testid={`pick-country-${country.id}`}
              onClick={() =>
                patch({
                  country: country.name,
                  city: draft.country === country.name ? draft.city : "",
                  location: draft.country === country.name && draft.city ? `${country.name} ${draft.city}` : country.name,
                  error: "",
                })
              }
            >
              {country.id === "gu" ? "關島" : country.name}
            </button>
          ))}
        </div>
      </div>
      <div className="wire-field">
        <label htmlFor="map-city">城市</label>
        <input
          id="map-city"
          data-testid="field-city"
          value={draft.city}
          onChange={(event) => patch({ city: event.target.value })}
        />
        <div className="destination-picks" role="group" aria-label="常去城市">
          {(matchDestinationCountry(draft.country)?.places.map((place) => ({
            country: draft.country.trim(),
            city: place.name,
            key: place.id,
          })) ??
            getPopularCityShortcuts().map((item) => ({
              country: item.country,
              city: item.city,
              key: `${item.country}-${item.city}`,
            }))
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              className="destination-pick"
              aria-pressed={draft.country === item.country && draft.city === item.city}
              data-testid={`pick-city-${item.key}`}
              onClick={() =>
                patch({
                  country: item.country,
                  city: item.city,
                  location: `${item.country} ${item.city}`,
                  error: "",
                })
              }
            >
              {item.city}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="wire-btn" data-testid="wizard-back" onClick={goBack}>
        上一步
      </button>
      <button type="submit" className="wire-btn wire-btn-primary">下一步：天數</button>
    </form>
      </>
  );
}
