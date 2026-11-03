"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { destinations } from "@/lib/destinations";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

const places = {
  type: "FeatureCollection" as const,
  features: destinations.flatMap((country) =>
    country.places.map((place) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [place.longitude, place.latitude] as [number, number],
      },
      properties: {
        country: country.name,
        place: place.name,
      },
    })),
  ),
};

export function DestinationMap({ onPick }: { onPick: (country: string, city: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onPickRef = useRef(onPick);
  const [loadError, setLoadError] = useState("");
  onPickRef.current = onPick;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map: MapLibreMap | null = null;
    let cancelled = false;

    void (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled) return;
      maplibregl.setWorkerUrl(new URL("../../node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
      map = new maplibregl.Map({
        container,
        style: MAP_STYLE,
        center: [20, 20],
        zoom: 1.15,
        attributionControl: false,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("error", (event) => {
        if (cancelled) return;
        const message = event.error?.message ?? "";
        if (message.includes("Worker") || /style/i.test(message)) {
          setLoadError("地圖暫時載入不到，可以直接打國家和城市");
        }
      });
      map.on("load", () => {
        if (!map) return;
        map.addSource("places", {
          type: "geojson",
          data: places,
          cluster: true,
          clusterRadius: 42,
          clusterMaxZoom: 12,
        });
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "places",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#8b7cf7",
            "circle-radius": 16,
            "circle-stroke-width": 7,
            "circle-stroke-color": "rgba(139, 124, 247, 0.35)",
          },
        });
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "places",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
          },
        });
        map.addLayer({
          id: "places-point",
          type: "circle",
          source: "places",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#9aa6ff",
            "circle-radius": 6,
            "circle-stroke-width": 6,
            "circle-stroke-color": "rgba(154, 166, 255, 0.35)",
          },
        });
        map.addLayer({
          id: "places-label",
          type: "symbol",
          source: "places",
          filter: ["!", ["has", "point_count"]],
          layout: {
            "text-field": ["get", "place"],
            "text-size": 12,
            "text-offset": [0, 1.15],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#f7f4ee",
            "text-halo-color": "#111111",
            "text-halo-width": 1.2,
          },
        });

        map.on("click", "clusters", async (event) => {
          const feature = event.features?.[0];
          const clusterId = Number(feature?.properties?.cluster_id);
          if (!map || feature?.geometry.type !== "Point" || !Number.isInteger(clusterId)) return;
          const source = map.getSource("places");
          if (!source || !("getClusterExpansionZoom" in source)) return;
          const zoom = await (source as GeoJSONSource).getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: feature.geometry.coordinates as [number, number],
            zoom,
          });
        });
        const bounds = new maplibregl.LngLatBounds();
        for (const feature of places.features) bounds.extend(feature.geometry.coordinates);
        map.fitBounds(bounds, {
          padding: { top: 56, right: 28, bottom: 300, left: 28 },
          maxZoom: 2,
          duration: 0,
        });

        map.on("click", "places-point", (event) => {
          const feature = event.features?.[0];
          const countryName = feature?.properties?.country;
          const placeName = feature?.properties?.place;
          if (typeof countryName === "string" && typeof placeName === "string") {
            onPickRef.current(countryName, placeName);
            if (map && feature?.geometry.type === "Point") {
              map.easeTo({ center: feature.geometry.coordinates as [number, number], zoom: Math.max(map.getZoom(), 5) });
            }
          }
        });
        for (const layer of ["clusters", "places-point"]) {
          map.on("mouseenter", layer, () => {
            map?.getCanvas().style.setProperty("cursor", "pointer");
          });
          map.on("mouseleave", layer, () => {
            map?.getCanvas().style.setProperty("cursor", "");
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className="map-canvas"
        data-testid="destination-map"
        style={{ position: "absolute", inset: 0, height: "100%", width: "100%" }}
      />
      {loadError ? (
        <p className="text-sm font-bold" style={{ position: "absolute", top: 52, left: 12, right: 12, zIndex: 2 }}>
          {loadError}
        </p>
      ) : null}
    </>
  );
}
