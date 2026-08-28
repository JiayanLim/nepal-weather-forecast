/**
 * Color scales for weather variable visualization.
 * Each scale maps a normalized value [0, 1] to RGBA.
 */

import {
  DISPLAY_N_LAT, DISPLAY_N_LON, DISPLAY_STEP,
  DISPLAY_LAT_MAX, DISPLAY_LAT_MIN, DISPLAY_LON_MIN,
} from '../geo/mask';

export interface ColorStop {
  pos: number;  // 0–1
  r: number;
  g: number;
  b: number;
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export function buildLUT(stops: ColorStop[], size = 256): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(size * 4);
  for (let i = 0; i < size; i++) {
    const t = i / (size - 1);
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let j = 0; j < stops.length - 1; j++) {
      if (t >= stops[j].pos && t <= stops[j + 1].pos) {
        lo = stops[j];
        hi = stops[j + 1];
        break;
      }
    }
    const span = hi.pos - lo.pos;
    const u = span > 0 ? (t - lo.pos) / span : 0;
    lut[i * 4 + 0] = lerp(lo.r, hi.r, u);
    lut[i * 4 + 1] = lerp(lo.g, hi.g, u);
    lut[i * 4 + 2] = lerp(lo.b, hi.b, u);
    lut[i * 4 + 3] = 200;
  }
  return lut;
}

// Temperature: blue → white → orange → red (-5°C to 40°C)
// Nepal range: roughly -3°C to 36°C — extended slightly for headroom.
export const TEMP_MIN = -5;
export const TEMP_MAX = 40;
export const TEMP_LUT = buildLUT([
  { pos: 0.000, r: 49,  g: 54,  b: 149 }, // -5°C  dark blue
  { pos: 0.111, r: 69,  g: 117, b: 180 }, //  0°C  blue
  { pos: 0.222, r: 116, g: 173, b: 209 }, //  5°C  light blue
  { pos: 0.333, r: 171, g: 217, b: 233 }, // 10°C  pale blue
  { pos: 0.444, r: 224, g: 243, b: 248 }, // 15°C  near white
  { pos: 0.556, r: 254, g: 224, b: 144 }, // 20°C  pale yellow
  { pos: 0.667, r: 253, g: 174, b: 97  }, // 25°C  orange
  { pos: 0.778, r: 244, g: 109, b: 67  }, // 30°C  red-orange
  { pos: 0.889, r: 215, g: 48,  b: 39  }, // 35°C  red
  { pos: 1.000, r: 165, g: 0,   b: 38  }, // 40°C  dark red
]);

// Precipitation: sqrt color scale — Nepal monsoon calibration.
// PRECIP_MAX = 3 mm/hr. Nepal Aug data: P50=0.23, P95=0.80, max=2.35 mm/hr.
//
// Rendering applies sqrt transform: norm_display = sqrt(v / PRECIP_MAX).
//   P50  (0.23 mm/hr) → norm=0.277  blue-teal (clearly visible)
//   P75  (0.42 mm/hr) → norm=0.374  green
//   P95  (0.80 mm/hr) → norm=0.516  yellow-green
//   max  (2.35 mm/hr) → norm=0.885  orange-red
//   3.0  mm/hr         → norm=1.000  deep red
export const PRECIP_MIN = 0;
export const PRECIP_MAX = 3;
export const PRECIP_LUT = buildLUT([
  { pos: 0.000, r: 210, g: 235, b: 255 }, // 0         very pale blue (trace)
  { pos: 0.100, r: 140, g: 200, b: 255 }, // ~0.03     light blue
  { pos: 0.183, r:  60, g: 150, b: 255 }, // ~0.10     medium blue
  { pos: 0.277, r:   0, g: 185, b: 170 }, // P50 0.23  blue-teal
  { pos: 0.374, r:  50, g: 210, b:  50 }, // P75 0.42  green
  { pos: 0.516, r: 190, g: 230, b:   0 }, // P95 0.80  yellow-green
  { pos: 0.577, r: 255, g: 200, b:   0 }, // 1.0 mm/hr yellow
  { pos: 0.745, r: 255, g: 120, b:   0 }, // ~1.67     orange
  { pos: 0.885, r: 230, g:  50, b:   0 }, // max 2.35  red-orange
  { pos: 1.000, r: 165, g:   0, b:  30 }, // 3.0+      deep red
]);

// Alpha ramp in sqrt-norm space:
//   v < 0.003 mm/hr → fully transparent (noise suppression)
//   v 0.003–0.010   → ramp 0→200
//   v ≥ 0.010       → fully opaque (alpha=200)
export const PRECIP_LUT_ALPHA = (() => {
  const lut = new Uint8ClampedArray(PRECIP_LUT);
  const size = lut.length / 4;
  const CUT_LO = Math.sqrt(0.003 / PRECIP_MAX);
  const CUT_HI = Math.sqrt(0.010 / PRECIP_MAX);
  for (let i = 0; i < size; i++) {
    const norm = i / (size - 1);
    const alpha =
      norm < CUT_LO ? 0 :
      norm < CUT_HI ? Math.round((norm - CUT_LO) / (CUT_HI - CUT_LO) * 200) :
      200;
    lut[i * 4 + 3] = alpha;
  }
  return lut;
})();

// Wind speed: calm/transparent → light blue → green → yellow → red (0 to 15 kt)
// Nepal max ~14 kt — scale reduced from Myanmar's 30 kt for better visibility.
export const WIND_MIN = 0;
export const WIND_MAX = 15;
export const WIND_LUT = buildLUT([
  { pos: 0.00, r: 255, g: 255, b: 255 }, // 0      white
  { pos: 0.10, r: 180, g: 220, b: 255 }, // 1.5 kt pale blue
  { pos: 0.20, r: 80,  g: 200, b: 255 }, // 3 kt   sky blue
  { pos: 0.33, r: 0,   g: 200, b: 100 }, // 5 kt   green
  { pos: 0.50, r: 100, g: 220, b: 50  }, // 7.5 kt yellow-green
  { pos: 0.67, r: 255, g: 220, b: 0   }, // 10 kt  yellow
  { pos: 0.83, r: 255, g: 120, b: 0   }, // 12.5kt orange
  { pos: 1.00, r: 200, g: 0,   b: 0   }, // 15+ kt red
]);

export const WIND_LUT_ALPHA = (() => {
  const lut = new Uint8ClampedArray(WIND_LUT);
  const size = lut.length / 4;
  for (let i = 0; i < size; i++) {
    const norm = i / (size - 1);
    const alpha = norm < 0.015 ? 0 : norm < 0.06 ? Math.round((norm - 0.015) / 0.045 * 200) : 200;
    lut[i * 4 + 3] = alpha;
  }
  return lut;
})();

export const TEMP_TICKS   = [-5, 0, 5, 10, 15, 20, 25, 30, 35, 40];
export const PRECIP_TICKS = [0, 0.1, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0, 3.0];
export const WIND_TICKS   = [0, 3, 5, 7, 10, 12, 15];

/** HSL to RGB conversion. h in [0,360], s and l in [0,1]. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function applyColorscale(
  frame: Float32Array,
  lut: Uint8ClampedArray,
  vmin: number,
  vmax: number,
  nLat: number,
  nLon: number,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(nLat * nLon * 4);
  const range = vmax - vmin;
  for (let i = 0; i < nLat * nLon; i++) {
    const v = frame[i];
    if (isNaN(v) || v <= -9000) {
      rgba[i * 4 + 3] = 0;
      continue;
    }
    const norm = Math.max(0, Math.min(1, (v - vmin) / range));
    const idx = Math.round(norm * 255);
    rgba[i * 4 + 0] = lut[idx * 4 + 0];
    rgba[i * 4 + 1] = lut[idx * 4 + 1];
    rgba[i * 4 + 2] = lut[idx * 4 + 2];
    rgba[i * 4 + 3] = lut[idx * 4 + 3];
  }
  return rgba;
}

/**
 * Render scalar weather data at display resolution (0.05°) using bilinear
 * interpolation from the model grid, with optional Nepal boundary masking.
 *
 * modelStep is derived at runtime from metadata.native_resolution_deg (e.g. 0.25).
 *
 * Model data layout: frame[latIdx * nLonSrc + lonIdx]
 *   latIdx 0 = lat_min (south), latIdx nLatSrc-1 = lat_max (north)
 *
 * Output: RGBA Uint8ClampedArray at DISPLAY_N_LAT × DISPLAY_N_LON.
 *   row 0 = lat_max (north top), row DISPLAY_N_LAT-1 = lat_min (south bottom)
 */
export function renderWithInterpolation(
  frame: Float32Array,
  lut: Uint8ClampedArray,
  vmin: number,
  vmax: number,
  modelStep: number,
  nLatSrc: number,
  nLonSrc: number,
  mask: Uint8Array | null,
  sqrtScale = false,
): Uint8ClampedArray {
  const nLatDst = DISPLAY_N_LAT;
  const nLonDst = DISPLAY_N_LON;
  const rgba = new Uint8ClampedArray(nLatDst * nLonDst * 4);
  const range = vmax - vmin;

  for (let iLat = 0; iLat < nLatDst; iLat++) {
    const lat = DISPLAY_LAT_MAX - iLat * DISPLAY_STEP;
    const fi = (lat - DISPLAY_LAT_MIN) / modelStep;
    const i0 = Math.max(0, Math.min(nLatSrc - 2, Math.floor(fi)));
    const i1 = i0 + 1;
    const ty = fi - i0;

    for (let iLon = 0; iLon < nLonDst; iLon++) {
      const pix = iLat * nLonDst + iLon;

      if (mask && mask[pix] === 0) continue;

      const lon = DISPLAY_LON_MIN + iLon * DISPLAY_STEP;
      const fj = (lon - DISPLAY_LON_MIN) / modelStep;
      const j0 = Math.max(0, Math.min(nLonSrc - 2, Math.floor(fj)));
      const j1 = j0 + 1;
      const tx = fj - j0;

      const v00 = frame[i0 * nLonSrc + j0];
      const v01 = frame[i0 * nLonSrc + j1];
      const v10 = frame[i1 * nLonSrc + j0];
      const v11 = frame[i1 * nLonSrc + j1];

      if (isNaN(v00) || v00 <= -9000) continue;

      const v = v00 * (1 - ty) * (1 - tx)
              + v01 * (1 - ty) * tx
              + v10 * ty * (1 - tx)
              + v11 * ty * tx;

      const linearNorm = Math.max(0, Math.min(1, (v - vmin) / range));
      const norm = sqrtScale ? Math.sqrt(linearNorm) : linearNorm;
      const idx = Math.round(norm * 255);
      rgba[pix * 4 + 0] = lut[idx * 4 + 0];
      rgba[pix * 4 + 1] = lut[idx * 4 + 1];
      rgba[pix * 4 + 2] = lut[idx * 4 + 2];
      rgba[pix * 4 + 3] = lut[idx * 4 + 3];
    }
  }

  return rgba;
}


/**
 * Render wind direction at display resolution using vector-component bilinear
 * interpolation (ADR-020). Raw degree values are NEVER interpolated directly.
 */
export function renderWindDirectionWithInterpolation(
  frame: Float32Array,
  modelStep: number,
  nLatSrc: number,
  nLonSrc: number,
  mask: Uint8Array | null,
): Uint8ClampedArray {
  const nLatDst = DISPLAY_N_LAT;
  const nLonDst = DISPLAY_N_LON;
  const rgba = new Uint8ClampedArray(nLatDst * nLonDst * 4);
  const DEG2RAD = Math.PI / 180;

  for (let iLat = 0; iLat < nLatDst; iLat++) {
    const lat = DISPLAY_LAT_MAX - iLat * DISPLAY_STEP;
    const fi = (lat - DISPLAY_LAT_MIN) / modelStep;
    const i0 = Math.max(0, Math.min(nLatSrc - 2, Math.floor(fi)));
    const i1 = i0 + 1;
    const ty = fi - i0;

    for (let iLon = 0; iLon < nLonDst; iLon++) {
      const pix = iLat * nLonDst + iLon;

      if (mask && mask[pix] === 0) continue;

      const lon = DISPLAY_LON_MIN + iLon * DISPLAY_STEP;
      const fj = (lon - DISPLAY_LON_MIN) / modelStep;
      const j0 = Math.max(0, Math.min(nLonSrc - 2, Math.floor(fj)));
      const j1 = j0 + 1;
      const tx = fj - j0;

      const d00 = frame[i0 * nLonSrc + j0];
      const d01 = frame[i0 * nLonSrc + j1];
      const d10 = frame[i1 * nLonSrc + j0];
      const d11 = frame[i1 * nLonSrc + j1];

      if (isNaN(d00) || d00 < 0) continue;

      const r00 = d00 * DEG2RAD;
      const r01 = d01 * DEG2RAD;
      const r10 = d10 * DEG2RAD;
      const r11 = d11 * DEG2RAD;

      const w00 = (1 - ty) * (1 - tx);
      const w01 = (1 - ty) * tx;
      const w10 = ty * (1 - tx);
      const w11 = ty * tx;

      const sinInterp = Math.sin(r00) * w00 + Math.sin(r01) * w01
                      + Math.sin(r10) * w10 + Math.sin(r11) * w11;
      const cosInterp = Math.cos(r00) * w00 + Math.cos(r01) * w01
                      + Math.cos(r10) * w10 + Math.cos(r11) * w11;

      const dirDeg = ((Math.atan2(sinInterp, cosInterp) / DEG2RAD) + 360) % 360;

      const [r, g, b] = hslToRgb(dirDeg, 0.85, 0.5);
      rgba[pix * 4 + 0] = r;
      rgba[pix * 4 + 1] = g;
      rgba[pix * 4 + 2] = b;
      rgba[pix * 4 + 3] = 200;
    }
  }

  return rgba;
}
