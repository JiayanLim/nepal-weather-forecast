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

### Phase N7 — Deployment
Pending user review.
