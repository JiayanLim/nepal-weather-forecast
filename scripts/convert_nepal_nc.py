"""
Convert Nepal Aurora 1.5 NetCDF forecast to Myanmar-compatible
forecast.json + float32 C-order binary files.

Usage:
    python scripts/convert_nepal_nc.py <nc_path> <output_dir>

Example:
    python scripts/convert_nepal_nc.py \
        /path/to/20260827_aurora_ifs.nc \
        frontend/public/data
"""

import json
import struct
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import xarray as xr


def main():
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <nc_path> <output_dir>")
        sys.exit(1)

    nc_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    ds = xr.open_dataset(nc_path)

    # Extract coordinates
    init_time = str(ds.coords["init_time"].values)  # numpy datetime64
    lead_times = ds.coords["lead_time"].values  # int32 hours
    lats_raw = ds.coords["lat"].values  # float32, DESCENDING (N→S)
    lons = ds.coords["lon"].values  # float32, ascending (W→E)

    # Flip lat to ascending (S→N) to match Myanmar convention
    lats = lats_raw[::-1]  # now ascending
    n_lat = len(lats)
    n_lon = len(lons)
    n_frames = len(lead_times)

    # Parse init time
    init_dt = np.datetime64(init_time)
    init_iso = str(init_dt).replace("T", "T") + "Z" if "T" in str(init_dt) else str(init_dt) + "T00:00:00Z"
    # Clean up init_iso
    init_py = datetime(
        int(str(init_dt)[:4]),
        int(str(init_dt)[5:7]),
        int(str(init_dt)[8:10]),
        tzinfo=timezone.utc,
    )

    # Generate valid times from init + lead_time
    times_utc = []
    for lt in lead_times:
        vt = init_py + timedelta(hours=int(lt))
        times_utc.append(vt.strftime("%Y-%m-%dT%H:%M:%SZ"))

    # Variable mapping: nc_name → (output_file, display_unit, description)
    var_map = {
        "tp1h_mmhr": ("precipitation.bin", "mm / hr", "1h precipitation rate"),
        "t2m_C": ("temperature.bin", "°C", "2m temperature"),
        "ws_kts": ("wind_speed.bin", "knots", "10m wind speed"),
        "wd_deg": ("wind_direction.bin", "degrees FROM (meteorological convention)", "10m wind direction"),
    }

    var_stats = {}

    for nc_name, (bin_file, display_unit, desc) in var_map.items():
        da = ds[nc_name]
        # shape: (lead_time, lat, lon) — lat is descending in NC
        arr = da.values  # (168, 19, 35)

        # Flip lat axis (axis=1) to ascending (S→N)
        arr = arr[:, ::-1, :]

        # Write flat float32 C-order binary
        flat = arr.astype(np.float32).flatten()
        bin_path = out_dir / bin_file
        flat.tofile(str(bin_path))

        expected_bytes = n_frames * n_lat * n_lon * 4
        actual_bytes = bin_path.stat().st_size
        assert actual_bytes == expected_bytes, (
            f"{bin_file}: expected {expected_bytes} bytes, got {actual_bytes}"
        )

        var_stats[nc_name] = {
            "file": bin_file,
            "shape": [n_frames, n_lat, n_lon],
            "dtype": "float32",
            "display_unit": display_unit,
            "min": float(np.nanmin(arr)),
            "max": float(np.nanmax(arr)),
            "mean": float(np.nanmean(arr)),
            "n_nan": int(np.isnan(arr).sum()),
            "n_total": int(arr.size),
        }

        print(f"  {bin_file}: {actual_bytes:,} bytes | "
              f"min={var_stats[nc_name]['min']:.4f} max={var_stats[nc_name]['max']:.4f}")

    # Build forecast.json
    forecast_json = {
        "schema_version": "4.0",
        "model": "Aurora 1.5",
        "model_version": "1.5",
        "model_source": "Microsoft Research — Aurora foundation model",
        "model_attribution": (
            "Aurora by Microsoft Research. Bodnar et al. (2024). "
            "Earth2Studio wrapper by NVIDIA."
        ),
        "earth2studio_version": str(ds.attrs.get("earth2studio_ver", "0.17.0")),
        "native_resolution_deg": 0.25,
        "native_timestep_hours": 1,
        "initialization_source": "IFS open data (ECMWF)",
        "initialization_time": init_iso,
        "init_timesteps": [
            (init_py - timedelta(hours=6)).strftime("%Y-%m-%dT%H:%M:%SZ"),
            init_iso,
        ],
        "forecast_generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "forecast_horizon_hours": int(lead_times[-1]),
        "n_frames": n_frames,
        "times_utc": times_utc,
        "region": "Nepal",
        "bbox": {
            "lat_min": float(lats[0]),
            "lat_max": float(lats[-1]),
            "lon_min": float(lons[0]),
            "lon_max": float(lons[-1]),
        },
        "grid": {
            "n_lat": n_lat,
            "n_lon": n_lon,
            "resolution_deg": 0.25,
            "lat_ordering": f"ascending (south→north, {lats[0]}→{lats[-1]})",
        },
        "lat": [float(x) for x in lats],
        "lon": [float(x) for x in lons],
        "variables": {
            "precipitation": {
                "file": "precipitation.bin",
                "shape": [n_frames, n_lat, n_lon],
                "dtype": "float32",
                "native_variable": "tp1h",
                "native_unit": "mm/hr",
                "display_unit": "mm / hr",
                "conversion": "max(0, tp1h_raw * 1000); already converted in NC",
                "stats": var_stats["tp1h_mmhr"],
            },
            "temperature": {
                "file": "temperature.bin",
                "shape": [n_frames, n_lat, n_lon],
                "dtype": "float32",
                "native_variable": "t2m",
                "native_unit": "°C",
                "display_unit": "°C",
                "conversion": "Already in °C in NC",
                "stats": var_stats["t2m_C"],
            },
            "wind_speed": {
                "file": "wind_speed.bin",
                "shape": [n_frames, n_lat, n_lon],
                "dtype": "float32",
                "native_variables": ["u10m", "v10m"],
                "native_unit": "knots",
                "display_unit": "knots",
                "conversion": "sqrt(u²+v²) × 1.94384; already converted in NC",
                "stats": var_stats["ws_kts"],
            },
            "wind_direction": {
                "file": "wind_direction.bin",
                "shape": [n_frames, n_lat, n_lon],
                "dtype": "float32",
                "native_variables": ["u10m", "v10m"],
                "native_unit": "degrees",
                "display_unit": "degrees FROM (meteorological convention)",
                "conversion": "Meteorological FROM convention; already computed in NC",
                "direction_normalized": True,
                "stats": var_stats["wd_deg"],
            },
        },
        "inference_config": {
            "hardware": str(ds.attrs.get("ic_source", "IFS")),
            "wall_clock_s": float(ds.attrs.get("wall_clock_s", 0)),
        },
        "ic_note": str(ds.attrs.get("ic_note", "")),
        "zero_filled_vars": str(ds.attrs.get("zero_filled_vars", "")),
        "is_demo": False,
    }

    json_path = out_dir / "forecast.json"
    with open(json_path, "w") as f:
        json.dump(forecast_json, f, indent=2, ensure_ascii=False)
    print(f"  forecast.json: {json_path.stat().st_size:,} bytes")

    # Validation summary
    print(f"\nConversion complete:")
    print(f"  Init: {init_iso}")
    print(f"  Frames: {n_frames} (lead {lead_times[0]}h–{lead_times[-1]}h)")
    print(f"  Grid: {n_lat} lat × {n_lon} lon ({lats[0]}–{lats[-1]}°N, {lons[0]}–{lons[-1]}°E)")
    print(f"  Lat ordering: ascending (S→N) — flipped from NC descending")
    print(f"  Output: {out_dir}")


if __name__ == "__main__":
    main()
