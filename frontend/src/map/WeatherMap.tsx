import { useEffect, useRef, useCallback } from 'react';
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
import { FloodOverlay } from './FloodOverlay';
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
  const floodPopupRef = useRef<maplibregl.Popup | null>(null);
  const popupOverlayRef = useRef<HTMLDivElement>(null);

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

  // Flood feature click handler
  const handleFloodClick = useCallback((e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
    const map = mapRef.current;
    if (!map || !e.features?.length) return;

    // Don't show flood popup if flood overlay is hidden
    if (!useForecastStore.getState().showFloodOverlay) return;

    const feat = e.features[0];
    const props = feat.properties || {};
    const layer = props.layer || '';

    // Close existing flood popup
    if (floodPopupRef.current) {
      floodPopupRef.current.remove();
      floodPopupRef.current = null;
    }

    let html = '';
    if (layer === 'flood_extent' || layer === 'copernicus_observed') {
      html = `
        <div class="wx-popup">
          <div class="wx-popup-title" style="color:#c0392b">2026 Nepal Flood Event</div>
          <div class="wx-popup-row">
            <span class="wx-popup-label">Type</span>
            <span class="wx-popup-value">Observed / Analysed Flood Extent</span>
          </div>
          <div class="wx-popup-row">
            <span class="wx-popup-label">Date</span>
            <span class="wx-popup-value">26 Aug 2026</span>
          </div>
          ${props.area_sq_km ? `<div class="wx-popup-row"><span class="wx-popup-label">Area</span><span class="wx-popup-value">${props.area_sq_km} km²</span></div>` : ''}
          ${props.area_ha ? `<div class="wx-popup-row"><span class="wx-popup-label">Area</span><span class="wx-popup-value">${Number(props.area_ha).toFixed(1)} ha</span></div>` : ''}
          ${props.description ? `<div class="wx-popup-row"><span class="wx-popup-label">Desc</span><span class="wx-popup-value">${props.description}</span></div>` : ''}
          <div class="wx-popup-note" style="color:#555;margin-top:4px">Source: ${props.source || 'EMSR927 / HOT'}</div>
          <div class="wx-popup-note" style="color:#7d5a0a;font-style:italic;margin-top:4px">
            This is observed flood extent — not an Aurora prediction.
          </div>
        </div>`;
    } else if (layer === 'facility') {
      html = `
        <div class="wx-popup">
          <div class="wx-popup-title" style="color:#c0392b">${props.name || 'Facility'}</div>
          <div class="wx-popup-row">
            <span class="wx-popup-label">Type</span>
            <span class="wx-popup-value">${props.type || '—'}</span>
          </div>
          <div class="wx-popup-row">
            <span class="wx-popup-label">Status</span>
            <span class="wx-popup-value" style="color:#c0392b">${props.damage || '—'}</span>
          </div>
          <div class="wx-popup-note" style="color:#555;margin-top:4px">Source: ${props.source || 'EMSR927'}</div>
        </div>`;
    } else if (layer === 'bridge') {
      html = `
        <div class="wx-popup">
          <div class="wx-popup-title" style="color:#c0392b">Bridge</div>
          <div class="wx-popup-row">
            <span class="wx-popup-label">Status</span>
            <span class="wx-popup-value" style="color:#c0392b">${props.damage || 'Destroyed'}</span>
          </div>
          <div class="wx-popup-note" style="color:#555;margin-top:4px">Source: ${props.source || 'EMSR927'}</div>
        </div>`;
    } else if (layer === 'damaged_road') {
      html = `
        <div class="wx-popup">
          <div class="wx-popup-title" style="color:#c0392b">${props.name || 'Road'}</div>
          <div class="wx-popup-row">
            <span class="wx-popup-label">Status</span>
            <span class="wx-popup-value" style="color:#c0392b">${props.damage || 'Destroyed'}</span>
          </div>
          <div class="wx-popup-note" style="color:#555;margin-top:4px">Source: ${props.source || 'EMSR927'}</div>
        </div>`;
    } else if (layer === 'event_marker') {
      html = `
        <div class="wx-popup">
          <div class="wx-popup-title" style="color:#c0392b">${props.name || 'Location'}</div>
          <div class="wx-popup-row">
            <span class="wx-popup-value">${props.description || 'Flood impact area'}</span>
          </div>
          <div class="wx-popup-row">
            <span class="wx-popup-label">Date</span>
            <span class="wx-popup-value">26 Aug 2026</span>
          </div>
          <div class="wx-popup-note" style="color:#555;margin-top:4px">Source: ${props.source || 'EMSR927 / HOT'}</div>
        </div>`;
    }

    if (!html) return;

    // Prevent the weather popup from also showing
    e.originalEvent.stopPropagation();

    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '260px',
      className: 'wx-maplibre-popup',
    })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);

    popup.on('close', () => {
      if (floodPopupRef.current === popup) floodPopupRef.current = null;
    });

    // Reparent popup DOM to overlay container so it renders above all analytical layers
    const el = popup.getElement();
    if (el && popupOverlayRef.current) {
      popupOverlayRef.current.appendChild(el);
      el.style.pointerEvents = 'auto';
    }

    floodPopupRef.current = popup;
  }, []);

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
      dragRotate: false,
      touchPitch: false,
    });

    // Disable rotation on pinch (keep pinch-zoom enabled)
    map.touchZoomRotate.disableRotation();

    mapRef.current = map;

    map.on('load', () => {
      // ── Nepal boundary ──
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

      // ── Flood analysis overlay (EMSR927 + HOT) ──
      // Renders on MapLibre canvas (below weather raster DOM canvas).
      // Strong styling ensures visibility through the 85%-opacity weather overlay.
      // Event markers + labels render in a separate React overlay above the canvas.
      map.addSource('flood-extent', {
        type: 'geojson',
        data: './geo/nepal-flood-2026-08-26.geojson',
      });

      // Flood/landslide fill — strong red, high opacity to show through weather layer
      map.addLayer({
        id: 'flood-fill',
        type: 'fill',
        source: 'flood-extent',
        filter: ['in', ['get', 'layer'], ['literal', ['flood_extent', 'copernicus_observed']]],
        paint: {
          'fill-color': '#c0392b',
          'fill-opacity': 0.55,
        },
      });

      // Flood outline — thick dashed line
      map.addLayer({
        id: 'flood-outline',
        type: 'line',
        source: 'flood-extent',
        filter: ['in', ['get', 'layer'], ['literal', ['flood_extent', 'copernicus_observed']]],
        paint: {
          'line-color': '#922b21',
          'line-width': 3,
          'line-dasharray': [4, 2.5],
          'line-opacity': 0.95,
        },
      });

      // Damaged roads — orange dashed lines, visible at zoom >= 8
      map.addLayer({
        id: 'flood-roads',
        type: 'line',
        source: 'flood-extent',
        filter: ['==', ['get', 'layer'], 'damaged_road'],
        minzoom: 8,
        paint: {
          'line-color': '#e67e22',
          'line-width': 2.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.85,
        },
      });

      // Destroyed bridges — orange circles, visible at zoom >= 8.5
      map.addLayer({
        id: 'flood-bridges',
        type: 'circle',
        source: 'flood-extent',
        filter: ['==', ['get', 'layer'], 'bridge'],
        minzoom: 8.5,
        paint: {
          'circle-radius': 4,
          'circle-color': '#e67e22',
          'circle-stroke-color': '#7f3d00',
          'circle-stroke-width': 1.5,
          'circle-opacity': 0.9,
        },
      });

      // Named facilities — larger red circles, visible at zoom >= 7.5
      map.addLayer({
        id: 'flood-facilities',
        type: 'circle',
        source: 'flood-extent',
        filter: ['==', ['get', 'layer'], 'facility'],
        minzoom: 7.5,
        paint: {
          'circle-radius': 6,
          'circle-color': '#c0392b',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        },
      });

      // Facility labels — visible at zoom >= 8
      map.addLayer({
        id: 'flood-facility-labels',
        type: 'symbol',
        source: 'flood-extent',
        filter: ['==', ['get', 'layer'], 'facility'],
        minzoom: 8,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 11,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#e74c3c',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
        },
      });

      // Event marker circles — red dots
      // Major markers at zoom >= 7, all at zoom >= 8
      map.addLayer({
        id: 'flood-markers',
        type: 'circle',
        source: 'flood-extent',
        filter: ['==', ['get', 'layer'], 'event_marker'],
        minzoom: 7,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 5, 10, 8],
          'circle-color': '#e74c3c',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.95,
        },
      });

      // Event marker labels — name only, zoom-dependent
      map.addLayer({
        id: 'flood-marker-labels',
        type: 'symbol',
        source: 'flood-extent',
        filter: ['==', ['get', 'layer'], 'event_marker'],
        minzoom: 7.5,
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 7.5, 10, 10, 13],
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-optional': true,
        },
        paint: {
          'text-color': '#e74c3c',
          'text-halo-color': 'rgba(0,0,0,0.8)',
          'text-halo-width': 1.5,
        },
      });

      // Event marker description — shown at higher zoom
      map.addLayer({
        id: 'flood-marker-desc',
        type: 'symbol',
        source: 'flood-extent',
        filter: ['==', ['get', 'layer'], 'event_marker'],
        minzoom: 8.5,
        layout: {
          'text-field': ['get', 'description'],
          'text-font': ['Open Sans Regular'],
          'text-size': 9,
          'text-offset': [0, 2.8],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-optional': true,
        },
        paint: {
          'text-color': 'rgba(229, 115, 100, 0.8)',
          'text-halo-color': 'rgba(0,0,0,0.6)',
          'text-halo-width': 1,
        },
      });

      // Bridge labels at high zoom
      map.addLayer({
        id: 'flood-bridge-labels',
        type: 'symbol',
        source: 'flood-extent',
        filter: ['==', ['get', 'layer'], 'bridge'],
        minzoom: 9.5,
        layout: {
          'text-field': 'Bridge destroyed',
          'text-font': ['Open Sans Regular'],
          'text-size': 9,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'text-optional': true,
        },
        paint: {
          'text-color': '#e67e22',
          'text-halo-color': 'rgba(0,0,0,0.7)',
          'text-halo-width': 1,
        },
      });

      positionOverlay(map, useForecastStore.getState().metadata);

      // Flood feature click handlers
      const floodClickLayers = [
        'flood-fill', 'flood-markers', 'flood-facilities',
        'flood-bridges', 'flood-roads',
      ];
      for (const layerId of floodClickLayers) {
        map.on('click', layerId, handleFloodClick);
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = 'crosshair';
        });
      }
    });

    const onMove = () => positionOverlay(map, useForecastStore.getState().metadata);
    map.on('move', onMove);
    map.on('resize', onMove);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('click', (e) => {
      // Only set inspector if not clicking a flood feature
      const floodFeats = map.queryRenderedFeatures(e.point, {
        layers: ['flood-fill', 'flood-markers', 'flood-facilities', 'flood-bridges', 'flood-roads'],
      });
      if (floodFeats.length > 0 && useForecastStore.getState().showFloodOverlay) return;

      // Dismiss any open flood popup when clicking non-flood area
      if (floodPopupRef.current) {
        floodPopupRef.current.remove();
        floodPopupRef.current = null;
      }

      useForecastStore.getState().setInspectorPoint({ lat: e.lngLat.lat, lon: e.lngLat.lng });
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
    const floodLayers = [
      'flood-fill', 'flood-outline', 'flood-roads', 'flood-bridges',
      'flood-facilities', 'flood-facility-labels',
      'flood-markers', 'flood-marker-labels', 'flood-marker-desc',
      'flood-bridge-labels',
    ];
    for (const id of floodLayers) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis);
    }
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
          <hr style="border:none;border-top:1px solid rgba(0,0,0,0.12);margin:6px 0"/>
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

    // Reparent popup DOM to overlay container so it renders above all analytical layers
    const popupEl = popup.getElement();
    if (popupEl && popupOverlayRef.current) {
      popupOverlayRef.current.appendChild(popupEl);
      popupEl.style.pointerEvents = 'auto';
    }

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
      <FloodOverlay map={mapRef.current} />
      {/* Popup overlay — dedicated top-level container above ALL analytical layers */}
      <div
        ref={popupOverlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 20,
          overflow: 'visible',
        }}
      />
    </div>
  );
}
