# Plan: Nepal Weather Forecast Frontend
**Spec ID**: 003-nepal-frontend
**Version**: v1.0

---

## Phases

### Phase N0 — Repository Fork (COMPLETE)
Forked Myanmar repo to nepal-weather-forecast. Remote: github.com/JiayanLim/nepal-weather-forecast.

### Phase N1 — Data Inspection (COMPLETE)
Inspected nepal_ifs_evaluation.json and 20260827_aurora_ifs.nc.
Documented schema, grid, variables, and Myanmar incompatibilities.
GO recommendation issued.

### Phase N2 — Spec Kit + Data Conversion (COMPLETE)
- Created spec.md, plan.md, tasks.md for 003-nepal-frontend
- Wrote convert_nepal_nc.py conversion script
- Converted 20260827_aurora_ifs.nc to forecast.json + 4 binary files
- Validated all binaries against source NC (5 spot checks + global array match)

### Phase N3 — Geographic Adaptation (COMPLETE)
- Updated geo/mask.ts: Nepal display bounds (26.0-30.5N, 80.0-88.5E)
- Downloaded nepal-boundary.geojson from Natural Earth
- Removed myanmar-boundary.geojson
- Updated App.tsx boundary path

### Phase N4 — UI Adaptation (COMPLETE)
- colorscales.ts: Nepal-specific PRECIP_MAX=3, TEMP range -5 to 40, WIND_MAX=15
- WeatherMap.tsx: Nepal center/zoom/bounds, NPT timezone, "Nepal" label
- Header.tsx: "Nepal" title
- Timeline.tsx: 1h timestep, 168-frame support, lead hours from +1h
- Legend.tsx: Nepal precipitation description
- InfoPanel.tsx: Nepal-specific content, NPT timezone, IFS/Aurora context
- WindArrowOverlay.tsx: grid step 2, 15 kt scale
- index.html: Nepal title and description

### Phase N5 — Model Evaluation (COMPLETE)
- Rewrote ModelEvaluation.tsx: metrics unavailable notice, Aurora model context,
  Nepal-specific considerations, metric definitions preserved for reference

### Phase N6 — Validation (COMPLETE)
- tsc --noEmit: PASS
- npm run build: PASS
- Binary validation: ALL PASS (5 spot checks + 4 global array matches)
- Timestamp check: PASS (168 frames, +1h to +168h)

### Phase N7 — QA Validation (COMPLETE)
- Binary spot checks: 10/10 PASS
- forecast.json spec compliance: 25/25 PASS
- NPT timezone conversion: 3/3 PASS
- tsc --noEmit: PASS
- npm run build: PASS

### Phase N8 — Deployment (COMPLETE)
- Deployed to GitHub Pages: https://jiayanlim.github.io/nepal-weather-forecast/
- Commit: 5f301b7
- All assets verified live (JS, CSS, JSON, 4 binaries, GeoJSON)

### Phase N9 — Flood Analysis Overlay (COMPLETE)
- Downloaded Copernicus EMSR927 rapid mapping products (AOI01–AOI03 GeoPackages from HDX)
- Downloaded HOT observed flood extent GeoJSON from HDX
- Combined 5 features into nepal-flood-2026-08-26.geojson (~210 KB)
- Added toggleable flood layer to WeatherMap.tsx (red fill + outline)
- Added FloodToggle component (legend panel, independent of weather variable)
- Added flood event context to InfoPanel (source attribution, corridor, disclaimer)
- Added showFloodOverlay state to ForecastStore
- Updated spec kit with Section 8 (Flood Analysis Overlay) and ADR-N04

### Phase N9b — Enhanced Flood Overlay (COMPLETE)
- Expanded GeoJSON from 5 to 72 features across 6 layers (flood_extent, copernicus_observed,
  event_marker, facility, bridge, damaged_road) by parsing EMSR927 GeoPackages directly
- Custom Python WKB parser for GeoPackage binary geometry (Point, LineString, Polygon,
  MultiLineString, MultiPolygon)
- Enhanced WeatherMap.tsx with 10 MapLibre flood layers:
  - Polygon fill (55% opacity #c0392b) + dashed outline (#922b21, [4,2.5])
  - Damaged roads (orange dashed, minzoom 8)
  - Bridge markers (orange circles, minzoom 8.5) + labels (minzoom 9.5)
  - Facility markers (red circles, minzoom 7.5) + labels (minzoom 8)
  - Event markers (red circles, minzoom 7) + labels (minzoom 7.5) + descriptions (minzoom 8.5)
- Created FloodOverlay.tsx: React component rendering Google Maps-style pin markers
  above the weather canvas (z-index 3) for 9 key locations using map.project()
- Interactive flood popups on click with source attribution and "not Aurora" disclaimer
- Updated FloodToggle.tsx with compact two-entry legend + attribution line
- Zoom-dependent visibility prevents clutter at low zoom levels
