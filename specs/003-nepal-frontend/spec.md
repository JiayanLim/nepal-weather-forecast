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
