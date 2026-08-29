import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useForecastStore } from '../data/ForecastStore';
import { getFrame, getPointValue, nearestGridPoint } from '../data/ForecastLoader';
import {
  renderWithInterpolation,
  PRECIP_LUT_ALPHA, PRECIP_MIN, PRECIP_MAX,
  TEMP_LUT,        TEMP_MIN,   TEMP_MAX,
  WIND_LUT_ALPHA,  WIND_MIN,   WIND_MAX,
} from './colorscales';
import { WindArrowOverlay } from './WindArrowOverlay';
import { DISPLAY_N_LAT, DISPLAY_N_LON } from '../geo/mask';

const NEPAL_CENTER: [number, number] = [84.25, 28.25];

/** Format a UTC ISO timestamp as Nepal Standard Time (UTC+5:45, no DST). */
function toNPTStr(utcIso: string): string {
  const dt = new Date(utcIso);
  if (isNaN(dt.getTime())) return '';
  const nptMs = dt.getTime() + 345 * 60 * 1000; // +5h45m
  const npt = new Date(nptMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${pad(npt.getUTCHours())}:${pad(npt.getUTCMinutes())} NPT · ${npt.getUTCDate()} ${months[npt.getUTCMonth()]} ${npt.getUTCFullYear()}`;
}

/** Compass bearing label for a FROM direction in degrees. */
function compassLabel(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function WeatherMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const overlayCanvas = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);

  const {
    metadata,
    precipitation, temperature, windSpeed, windDirection,
    activeVariable,
    currentHour,
    isLoaded, setInspectorPoint, inspectorPoint,
    mask,
    showFloodOverlay,
  } = useForecastStore();

  const positionOverlay = (map: maplibregl.Map, meta: typeof metadata) => {
    const canvas = overlayCanvas.current;
    if (!canvas || !meta) return;
    const { lon_min, lat_max, lon_max, lat_min } = meta.bbox;
    const nw = map.project([lon_min, lat_max]);
    const se = map.project([lon_max, lat_min]);
    canvas.style.left   = `${nw.x}px`;
    canvas.style.top    = `${nw.y}px`;
    canvas.style.width  = `${Math.max(1, se.x - nw.x)}px`;
    canvas.style.height = `${Math.max(1, se.y - nw.y)}px`;
  };

  // Initialise map
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            paint: { 'raster-opacity': 0.55, 'raster-saturation': -0.4, 'raster-brightness-min': 0.05 },
          },
        ],
      },
      center: NEPAL_CENTER,
      zoom: 6.5,
      maxBounds: [[76, 24], [93, 33]],
      minZoom: 5,
      maxZoom: 10,
    });

    mapRef.current = map;

    map.on('load', () => {
      map.addSource('nepal-boundary', {
        type: 'geojson',
        data: './geo/nepal-boundary.geojson',
      });

      map.addLayer({
        id: 'nepal-fill',
        type: 'fill',
        source: 'nepal-boundary',
        paint: {
          'fill-color': 'rgba(255,255,255,0.03)',
          'fill-outline-color': 'rgba(255,255,255,0.0)',
        },
      });

      map.addLayer({
        id: 'nepal-outline',
        type: 'line',
        source: 'nepal-boundary',
        paint: {
          'line-color': 'rgba(255, 255, 255, 0.7)',
          'line-width': 1.5,
        },
      });

      // Flood analysis overlay — observed/analysed extent (EMSR927 + HOT)
      map.addSource('flood-extent', {
        type: 'geojson',
        data: './geo/nepal-flood-2026-08-26.geojson',
      });

      map.addLayer({
        id: 'flood-fill',
        type: 'fill',
        source: 'flood-extent',
        paint: {
          'fill-color': '#e53e3e',
          'fill-opacity': 0.25,
        },
      });

      map.addLayer({
        id: 'flood-outline',
        type: 'line',
        source: 'flood-extent',
        paint: {
          'line-color': '#e53e3e',
          'line-width': 2,
          'line-opacity': 0.85,
        },
      });

      positionOverlay(map, useForecastStore.getState().metadata);
    });

    const onMove = () => positionOverlay(map, useForecastStore.getState().metadata);
    map.on('move', onMove);
    map.on('resize', onMove);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      useForecastStore.getState().setInspectorPoint({ lat, lon: lng });
    });

    map.on('mousemove', () => {
      map.getCanvas().style.cursor = 'crosshair';
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle flood overlay visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const vis = showFloodOverlay ? 'visible' : 'none';
    if (map.getLayer('flood-fill')) map.setLayoutProperty('flood-fill', 'visibility', vis);
    if (map.getLayer('flood-outline')) map.setLayoutProperty('flood-outline', 'visibility', vis);
  }, [showFloodOverlay]);

  // Draw weather overlay onto the canvas
  useEffect(() => {
    const canvas = overlayCanvas.current;
    const map = mapRef.current;
    if (!canvas || !isLoaded || !metadata) return;

    const { n_lat, n_lon } = metadata.grid;
    const modelStep = metadata.native_resolution_deg;

    const [data, lut, vmin, vmax] =
      activeVariable === 'temperature' && temperature
        ? [temperature, TEMP_LUT,       TEMP_MIN, TEMP_MAX]
        : activeVariable === 'wind_speed' && windSpeed
        ? [windSpeed,   WIND_LUT_ALPHA, WIND_MIN, WIND_MAX]
        : precipitation
        ? [precipitation, PRECIP_LUT_ALPHA, PRECIP_MIN, PRECIP_MAX]
        : [null, null, 0, 1];

    if (!data || !lut) return;

    const frame = getFrame(data, currentHour, n_lat, n_lon);
    const sqrtScale = activeVariable === 'precipitation';
    const rgba = renderWithInterpolation(frame, lut, vmin, vmax, modelStep, n_lat, n_lon, mask, sqrtScale);

    canvas.width  = DISPLAY_N_LON;
    canvas.height = DISPLAY_N_LAT;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(rgba.buffer as ArrayBuffer), DISPLAY_N_LON, DISPLAY_N_LAT),
        0, 0,
      );
    }

    if (map) positionOverlay(map, metadata);
  }, [isLoaded, metadata, currentHour, precipitation, temperature, windSpeed, activeVariable, mask]);

  // Point inspector popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !metadata) return;

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    if (!inspectorPoint) return;

    const { lat, lon } = inspectorPoint;
    const { n_lat, n_lon } = metadata.grid;
    const grid = nearestGridPoint(lat, lon, metadata.lat, metadata.lon);

    let content: string;

    if (!grid) {
      content = `
        <div class="wx-popup">
          <div class="wx-popup-title">Outside forecast domain</div>
          <p class="wx-popup-note">No forecast data for this location.</p>
        </div>`;
    } else {
      const precipVal = precipitation
        ? getPointValue(precipitation, currentHour, grid.latIdx, grid.lonIdx, n_lat, n_lon)
        : NaN;
      const tempVal = temperature
        ? getPointValue(temperature, currentHour, grid.latIdx, grid.lonIdx, n_lat, n_lon)
        : NaN;
      const wsVal = windSpeed
        ? getPointValue(windSpeed, currentHour, grid.latIdx, grid.lonIdx, n_lat, n_lon)
        : NaN;
      const wdVal = windDirection
        ? getPointValue(windDirection, currentHour, grid.latIdx, grid.lonIdx, n_lat, n_lon)
        : NaN;

      const validTime = metadata.times_utc[currentHour] ?? '';
      const dt = new Date(validTime);
      const timeStr = dt.toUTCString().replace(' GMT', ' UTC');
      const nptStr = validTime ? toNPTStr(validTime) : '';
      const stepHours = metadata.native_timestep_hours ?? 1;
      const leadH = (currentHour + 1) * stepHours;

      const fmt = (v: number, dp: number, unit: string) =>
        isNaN(v) ? '—' : `${v.toFixed(dp)} ${unit}`;

      const wdStr = isNaN(wdVal)
        ? '—'
        : `${Math.round(wdVal)}° FROM ${compassLabel(wdVal)}`;

      const [activeLabel, activeValStr] =
        activeVariable === 'temperature'
          ? ['Temperature',  fmt(tempVal,   1, '°C')]
          : activeVariable === 'wind_speed'
          ? ['Wind',         `${fmt(wsVal, 1, 'kt')} · ${isNaN(wdVal) ? '—' : wdStr}`]
          : ['Precipitation', fmt(precipVal, 2, 'mm/hr')];

      content = `
        <div class="wx-popup">
          <div class="wx-popup-title">Nepal</div>
          <div class="wx-popup-time">${timeStr}</div>
          ${nptStr ? `<div class="wx-popup-time" style="opacity:0.7">${nptStr}</div>` : ''}
          <div class="wx-popup-row">
            <span class="wx-popup-label">${activeLabel}</span>
            <span class="wx-popup-value">${activeValStr}</span>
          </div>
          ${activeVariable === 'precipitation'
            ? `<div class="wx-popup-note">1h precipitation rate</div>`
            : ''
          }
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:6px 0"/>
          <div class="wx-popup-row" style="opacity:0.65">
            <span class="wx-popup-label">Temp</span>
            <span class="wx-popup-value">${fmt(tempVal, 1, '°C')}</span>
          </div>
          <div class="wx-popup-row" style="opacity:0.65">
            <span class="wx-popup-label">Precip</span>
            <span class="wx-popup-value">${fmt(precipVal, 2, 'mm/hr')}</span>
          </div>
          <div class="wx-popup-row" style="opacity:0.65">
            <span class="wx-popup-label">Wind</span>
            <span class="wx-popup-value">${fmt(wsVal, 1, 'kt')} ${isNaN(wdVal) ? '' : compassLabel(wdVal)}</span>
          </div>
          <div class="wx-popup-coords">${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E · +${leadH}h lead</div>
        </div>`;
    }

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '260px',
      className: 'wx-maplibre-popup',
    })
      .setLngLat([lon, lat])
      .setHTML(content)
      .addTo(map);

    popup.on('close', () => {
      useForecastStore.getState().setInspectorPoint(null);
    });

    popupRef.current = popup;
  }, [inspectorPoint, currentHour, isLoaded, metadata, precipitation, temperature, windSpeed, windDirection, activeVariable]);

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0f1117' }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      <canvas
        ref={overlayCanvas}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          opacity: 0.85,
          imageRendering: 'pixelated',
          display: isLoaded ? 'block' : 'none',
        }}
      />
      <WindArrowOverlay map={mapRef.current} />
    </div>
  );
}
