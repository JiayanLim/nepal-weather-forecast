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

## Pending

- [ ] N7-REVIEW: User review of implementation
- [ ] N8-DEPLOY: Deploy to GitHub Pages
