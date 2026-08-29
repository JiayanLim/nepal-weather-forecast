# Tasks: Nepal Weather Forecast Frontend
**Spec ID**: 003-nepal-frontend
**Version**: v1.0

---

## Completed

- [x] N0: Fork Myanmar repo → nepal-weather-forecast
- [x] N1: Inspect Nepal NC data schema and produce Myanmar mapping
- [x] N2-SPEC: Create spec.md, plan.md, tasks.md
- [x] N2-CONV: Write convert_nepal_nc.py
- [x] N2-DATA: Convert 20260827_aurora_ifs.nc → forecast.json + 4 .bin files
- [x] N2-VALID: Validate binaries (spot checks + global match)
- [x] N3-GEO: Update geo/mask.ts for Nepal bounds
- [x] N3-GEOJSON: Download nepal-boundary.geojson
- [x] N3-CLEANUP: Remove myanmar-boundary.geojson
- [x] N3-APP: Update App.tsx boundary path
- [x] N4-COLOR: Update colorscales.ts (PRECIP_MAX=3, TEMP -5 to 40, WIND 0-15)
- [x] N4-MAP: Update WeatherMap.tsx (center, zoom, bounds, NPT, Nepal label)
- [x] N4-HEADER: Update Header.tsx ("Nepal")
- [x] N4-TIMELINE: Update Timeline.tsx (1h timestep, 168 frames, lead from +1h)
- [x] N4-LEGEND: Update Legend.tsx (Nepal precip description)
- [x] N4-INFO: Update InfoPanel.tsx (Nepal content, NPT, IFS/Aurora)
- [x] N4-WIND: Update WindArrowOverlay.tsx (grid step 2, 15 kt scale)
- [x] N4-HTML: Update index.html (Nepal title)
- [x] N5-EVAL: Rewrite ModelEvaluation.tsx (metrics unavailable)
- [x] N6-TSC: TypeScript check — PASS
- [x] N6-BUILD: npm run build — PASS
- [x] N6-DEPLOY-YML: Update deploy-pages.yml for Nepal

- [x] N7-QA: Local visual QA validation — ALL PASS
- [x] N8-DEPLOY: Deploy to GitHub Pages (commit 5f301b7)

## Phase N9 — Flood Analysis Overlay

- [x] N9-DATA: Download Copernicus EMSR927 AOI01–AOI03 GeoPackages from HDX
- [x] N9-HOT: Download HOT observed flood extent GeoJSON from HDX
- [x] N9-COMBINE: Combine EMSR927 + HOT into nepal-flood-2026-08-26.geojson
- [x] N9-STORE: Add showFloodOverlay toggle to ForecastStore
- [x] N9-MAP: Add flood GeoJSON source + fill/outline layers to WeatherMap
- [x] N9-TOGGLE: Create FloodToggle component (legend panel, independent of variable)
- [x] N9-INFO: Add flood event context to InfoPanel (source, corridor, disclaimer)
- [x] N9-SPEC: Update spec kit (spec.md Section 8, plan.md Phase N9, tasks.md)

## Phase N9b — Enhanced Flood Overlay

- [x] N9b-GPKG: Parse EMSR927 GeoPackages (WKB geometry) for infrastructure layers
- [x] N9b-GEOJSON: Expand GeoJSON to 72 features / 6 layers (~230 KB)
- [x] N9b-FILL: Enhance flood fill (55% opacity, dashed outline)
- [x] N9b-INFRA: Add MapLibre layers for roads, bridges, facilities with zoom-dependent visibility
- [x] N9b-MARKERS: Add event marker + facility layers with labels/descriptions
- [x] N9b-OVERLAY: Create FloodOverlay.tsx (above-canvas pin markers via map.project())
- [x] N9b-POPUP: Add interactive flood popups with provenance + disclaimer
- [x] N9b-LEGEND: Update FloodToggle with compact two-entry legend + attribution
- [x] N9b-SPEC: Update spec kit (Section 8 enhanced, plan.md N9b, tasks.md)

## Phase N10 — UI Fixes

- [x] N10-LABEL: Fix Aurora model label duplication in Header, InfoPanel, ModelEvaluation
- [x] N10-POPUP-PERSIST: Make flood popups persistent (closeOnClick disabled, manual dismiss)
- [x] N10-POPUP-ZINDEX: Popup above all analytical layers (z-index 10, dark-themed CSS)
- [x] N10-POPUP-REPLACE: Click another flood feature replaces popup (no multiple popups)
- [x] N10-SPEC: Update spec kit (popup interaction model, model label deduplication)
