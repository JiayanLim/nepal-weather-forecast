# Specification: Nepal Weather Forecast Frontend
**Spec ID**: 003-nepal-frontend
**Version**: v1.0
**Created**: 2026-08-28

---

## 1. Objective

Adapt the Myanmar weather forecast frontend to display Aurora 1.5 forecasts for Nepal.
The frontend must load Nepal-specific forecast data, render it on a Nepal-centered map with
boundary masking, and present all four weather variables with Nepal-appropriate visualization
parameters.

---

## 2. Source Data

| Field | Value |
|-------|-------|
| Model | Aurora 1.5 |
| IC source | IFS open data (ECMWF) |
| Init date | 2026-08-27T00:00:00Z |
| Horizon | 168h (7 days) |
| Timestep | 1 hour |
| Frames | 168 (t+1h through t+168h; no t+0h) |
| Grid | 19 lat x 35 lon at 0.25 deg |
| Lat range | 26.0 - 30.5 deg N (ascending in binary) |
| Lon range | 80.0 - 88.5 deg E |
| Lat ordering | Ascending (S to N) in binary; descending in source NC |

---

## 3. Variables

| Variable | Binary file | Unit | Range (observed) |
|----------|------------|------|-------------------|
| Precipitation | precipitation.bin | mm/hr | 0 - 2.35 |
| Temperature | temperature.bin | deg C | -2.6 - 36.4 |
| Wind speed | wind_speed.bin | knots | 0 - 13.9 |
| Wind direction | wind_direction.bin | degrees FROM | 0 - 360 |

All variables are pre-converted in the source NetCDF. No unit conversions in the frontend.

---

## 4. Visualization Parameters

### Precipitation
- PRECIP_MAX = 3 mm/hr
- sqrt normalization
- Ticks: [0, 0.1, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0]
- Calibrated for August monsoon (Nepal P95 = 0.80 mm/hr)

### Temperature
- TEMP_MIN = -5 deg C, TEMP_MAX = 40 deg C
- Linear scale
- Extended below 0 deg C for Nepal highland coverage

### Wind Speed
- WIND_MIN = 0, WIND_MAX = 15 kt
- Reduced from Myanmar's 30 kt (Nepal max ~14 kt)
- Arrow grid step = 2 (vs Myanmar's 3; smaller grid)

---

## 5. Geographic Configuration

| Parameter | Myanmar | Nepal |
|-----------|---------|-------|
| Display lat | 9.0 - 29.0 | 26.0 - 30.5 |
| Display lon | 92.0 - 102.0 | 80.0 - 88.5 |
| DISPLAY_N_LAT | 401 | 91 |
| DISPLAY_N_LON | 201 | 171 |
| Map center | [96.5, 19.0] | [84.25, 28.25] |
| Map zoom | 5.2 | 6.5 |
| Boundary GeoJSON | myanmar-boundary.geojson | nepal-boundary.geojson |
| Local timezone | MMT (UTC+6:30) | NPT (UTC+5:45) |

---

## 6. Model Evaluation

No verification metrics are available for this Nepal dataset.
The Model Evaluation panel displays metric definitions for reference and
Nepal-specific considerations, but no MAE/RMSE/bias/POD/FAR/CSI scores.

---

## 7. Key Decisions

- **ADR-N01**: Use full 1h/168-frame resolution (not subsampled to 6h).
  Rationale: binary files are small (~437 KB each); hourly resolution is a strength of Aurora 1.5.
- **ADR-N02**: Flip NC latitude (descending N-to-S) to ascending (S-to-N) during conversion.
  Rationale: preserves Myanmar frontend rendering convention; all rendering code assumes latIdx 0 = south.
- **ADR-N03**: Nepal-specific precipitation scale (PRECIP_MAX=3, monsoon-calibrated ticks).
  Rationale: Myanmar dry-season scale (max 2 mm/hr) compresses Nepal monsoon data into the lower range.
- **ADR-N04**: Flood analysis overlay uses local GeoJSON, not runtime API.
  Rationale: authoritative geometries from Copernicus EMSR927 + HOT are static; no external dependency needed.

---

## 8. Flood Analysis Overlay

### Purpose
Visual comparison of Aurora 1.5 meteorological forecast against the observed/analysed
flood extent from the 26 August 2026 Nepal Bhote Koshi–Trishuli flood event.

The overlay is NOT an Aurora-predicted flood extent. It shows independently mapped
observed damage from authoritative geospatial sources.

### Event
- **Date**: 26 August 2026
- **Trigger**: Glacial lake outburst / debris avalanche, upper Lhende Khola catchment
- **Corridor**: Lhende Khola → Bhote Koshi → Trishuli
- **Affected districts**: Rasuwa, Nuwakot, Dhading
- **Bbox**: lat 27.86–28.28°N, lon 84.56–85.38°E (within Nepal forecast domain)

### Data Sources
1. **Copernicus EMS EMSR927** — rapid mapping grading products (AOI01–AOI03).
   Photo-interpretation of satellite imagery. License: CC BY 4.0.
   HDX: `npl-flood-emsr927`. 4 MultiPolygon features (~8.3 km² total observed landslide area).
2. **Humanitarian OpenStreetMap Team (HOT)** — observed flood extent, 27 Aug 2026.
   Drone, Landsat, PlanetScope, Sentinel imagery. License: ODbL.
   HDX: `hot_flood_npl`. 1 Polygon feature (31.7 km² flood corridor).

Combined into: `frontend/public/geo/nepal-flood-2026-08-26.geojson` (72 features, 6 layers, ~230 KB).

### GeoJSON Layers

| Layer | Features | Geometry | Source |
|-------|----------|----------|--------|
| flood_extent | 1 | Polygon | HOT observed flood extent |
| copernicus_observed | 4 | MultiPolygon | EMSR927 AOI01–03 grading |
| event_marker | 6 | Point | Key affected locations |
| facility | 3 | Point | EMSR927 destroyed infrastructure |
| bridge | 24 | Point | EMSR927 destroyed bridges |
| damaged_road | 34 | LineString/MultiLineString | EMSR927 destroyed road segments |

### Key Affected Locations

| Name | Type | Min Zoom | Coordinates |
|------|------|----------|-------------|
| Rasuwagadhi | Event | 6.5 | 85.3546°E, 28.2595°N |
| Timure | Event | 7.5 | 85.3640°E, 28.2767°N |
| Syapru Besi | Event | 7.5 | 85.3388°E, 28.1604°N |
| Bidur | Event | 7.5 | 85.1389°E, 27.9096°N |
| Bhote Koshi | Event | 7.0 | 85.3250°E, 28.1100°N |
| Trishuli | Event | 7.0 | 85.1000°E, 27.8500°N |
| Rasuwagadhi Dam | Facility | 8.0 | 85.3771°E, 28.2742°N |
| Langtang Khola HPP | Facility | 8.5 | 85.3405°E, 28.1637°N |
| Trishuli Power House | Facility | 8.5 | 85.1459°E, 27.9213°N |

### Visual Hierarchy

The flood overlay renders at multiple z-levels to appear above weather data:

1. **MapLibre canvas layers** (below weather raster): flood polygon fill/outline, infrastructure (roads, bridges, facilities), facility/bridge labels
2. **React FloodOverlay component** (above weather raster, z-index 3): event markers and facility markers rendered as HTML pins using `map.project()` screen-space positioning (same pattern as WindArrowOverlay)

Visual stack: basemap → boundary → weather raster → wind arrows → flood markers → popup overlay (z-index 20)

### UI Requirements
- Toggleable independently from weather variables (available on all tabs)
- Semi-transparent red fill (#c0392b, 55% opacity) with dashed red outline (#922b21, pattern [4, 2.5])
- Toggle control in the legend panel with "2026 Flood Areas" label and compact legend entries
- Enabled by default on page load
- Zoom-dependent visibility:
  - Flood polygons + outlines: always visible when enabled
  - Event markers: minZoom 6.5–7.5 depending on location
  - Facility markers: minZoom 7.5–8.5
  - Bridge markers: minZoom 8.5
  - Damaged roads: minZoom 8
  - Bridge labels: minZoom 9.5
- Interactive flood popups on click (flood features, facilities, bridges, roads) with:
  - Feature name, type, source attribution
  - "Not an Aurora prediction" disclaimer
- Google Maps-style pin markers for key locations (colored background, name label, triangle stem)
- Contextual information in Info panel:
  - Event date, corridor, affected districts
  - Source attribution (EMSR927 + HOT)
  - Explicit "Observed / Analysed Flood Extent" label
  - Explicit disclaimer: NOT an Aurora-predicted flood extent
  - Note on glacial/debris-flow trigger vs precipitation forecast

### Popup Interaction Model

Desktop: click flood feature -> popup opens -> stays open -> click elsewhere -> closes.
Mobile: tap flood feature -> popup opens -> stays open -> tap elsewhere -> closes.

Requirements:
- Popups are persistent (not hover-only, not auto-dismissed)
- `closeOnClick: false` on MapLibre popup; manual dismiss on non-flood click
- Clicking another flood feature replaces the current popup (no multiple popups)
- Popup rendered in dedicated overlay container (z-index 20) above ALL analytical layers
  - MapLibre popup DOM element is reparented from map container to overlay container after creation
  - Overlay container has same position/size as map container (absolute, inset: 0) so popup
    transform coordinates remain valid
  - `pointerEvents: auto` set on popup element; container itself is `pointerEvents: none`
- Visual hierarchy: basemap -> weather raster -> wind arrows -> flood polygons -> flood markers -> popup
- Popup styled with high-contrast black text (#111) on white background, 2px black border
- MapLibre auto-anchoring ensures popup remains within viewport on desktop and mobile
- No automatic timeout; map movement does not dismiss popup

### Map Interaction

- Map rotation disabled on all platforms (`dragRotate: false`, `touchZoomRotate.disableRotation()`)
- Pinch-to-zoom enabled (only rotation component disabled)
- Touch pitch disabled (`touchPitch: false`)
- Pan/drag enabled on all platforms

### Model Label Display

The model label is constructed from `metadata.model` + `metadata.model_version`. When the version
string is already contained within the model name (e.g. model="Aurora 1.5", model_version="1.5"),
the version must NOT be appended again. All UI components (Header, InfoPanel, ModelEvaluation)
must deduplicate. Expected display: "Aurora 1.5" not "Aurora 1.5 1.5".

### Prohibitions
- Do NOT invent flood severity levels or classifications not present in source data
- Do NOT label overlay as Aurora-predicted or model-generated
- Do NOT simplify authoritative geometries for appearance
