/**
 * SVG flood event marker overlay — renders ABOVE the weather raster canvas.
 *
 * MapLibre vector layers (flood fill, outline, infrastructure) render on the
 * MapLibre canvas, which sits BELOW the weather raster DOM canvas. This overlay
 * component projects key event markers onto screen coordinates (like WindArrowOverlay)
 * so they appear on top of the weather data, maintaining the visual hierarchy:
 *   basemap → boundary → weather raster → wind arrows → flood markers
 */

import { useEffect, useState, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';
import { useForecastStore } from '../data/ForecastStore';

interface MarkerData {
  x: number;
  y: number;
  name: string;
  desc: string;
  type: 'event' | 'facility';
}

// Key event locations — coordinates from EMSR927 AOI localities and HOT extent
const EVENT_POINTS: { name: string; desc: string; lon: number; lat: number; type: 'event' | 'facility'; minZoom: number }[] = [
  { name: 'Rasuwagadhi', desc: 'Flood/debris-flow affected', lon: 85.3546, lat: 28.2595, type: 'event', minZoom: 6.5 },
  { name: 'Timure', desc: 'Flood/debris-flow affected', lon: 85.3640, lat: 28.2767, type: 'event', minZoom: 7.5 },
  { name: 'Syapru Besi', desc: 'Flood impact area', lon: 85.3388, lat: 28.1604, type: 'event', minZoom: 7.5 },
  { name: 'Bidur', desc: 'Downstream affected', lon: 85.1389, lat: 27.9096, type: 'event', minZoom: 7.5 },
  { name: 'Bhote Koshi', desc: 'Affected river corridor', lon: 85.3250, lat: 28.1100, type: 'event', minZoom: 7 },
  { name: 'Trishuli', desc: 'Downstream corridor', lon: 85.1000, lat: 27.8500, type: 'event', minZoom: 7 },
  // Named infrastructure from EMSR927
  { name: 'Rasuwagadhi Dam', desc: 'Hydropower dam — destroyed', lon: 85.3771, lat: 28.27416, type: 'facility', minZoom: 8 },
  { name: 'Langtang Khola HPP', desc: 'Power house — destroyed', lon: 85.34054, lat: 28.16372, type: 'facility', minZoom: 8.5 },
  { name: 'Trishuli Power House', desc: 'Power house — destroyed', lon: 85.14594, lat: 27.92133, type: 'facility', minZoom: 8.5 },
];

interface Props {
  map: maplibregl.Map | null;
}

export function FloodOverlay({ map }: Props) {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const showFloodOverlay = useForecastStore((s) => s.showFloodOverlay);

  const rebuild = useCallback(() => {
    if (!map || !showFloodOverlay) {
      setMarkers([]);
      return;
    }

    const zoom = map.getZoom();
    const result: MarkerData[] = [];

    for (const pt of EVENT_POINTS) {
      if (zoom < pt.minZoom) continue;
      const screen = map.project([pt.lon, pt.lat] as [number, number]);
      result.push({
        x: screen.x,
        y: screen.y,
        name: pt.name,
        desc: pt.desc,
        type: pt.type,
      });
    }

    setMarkers(result);
  }, [map, showFloodOverlay]);

  useEffect(() => { rebuild(); }, [rebuild]);

  useEffect(() => {
    if (!map) return;
    map.on('move', rebuild);
    map.on('resize', rebuild);
    map.on('zoom', rebuild);
    return () => {
      map.off('move', rebuild);
      map.off('resize', rebuild);
      map.off('zoom', rebuild);
    };
  }, [map, rebuild]);

  if (!showFloodOverlay || markers.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 3,
      }}
    >
      {markers.map((m, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: m.x,
            top: m.y,
            transform: 'translate(-50%, -100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Marker pin */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <div
              style={{
                background: m.type === 'facility' ? '#922b21' : '#c0392b',
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 3,
                whiteSpace: 'nowrap',
                lineHeight: '14px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {m.name}
            </div>
            {/* Stem */}
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `6px solid ${m.type === 'facility' ? '#922b21' : '#c0392b'}`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
