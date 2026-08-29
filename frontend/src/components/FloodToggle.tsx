import { useForecastStore } from '../data/ForecastStore';

export function FloodToggle() {
  const showFloodOverlay = useForecastStore((s) => s.showFloodOverlay);
  const toggleFloodOverlay = useForecastStore((s) => s.toggleFloodOverlay);

  return (
    <div className="mt-3 pt-2 border-t border-wx-border">
      <button
        onClick={toggleFloodOverlay}
        className="flex items-center gap-2 w-full text-left group"
        title="Toggle observed flood extent overlay (26 Aug 2026)"
      >
        <span
          className="w-3.5 h-3.5 rounded-sm shrink-0"
          style={{
            backgroundColor: showFloodOverlay ? 'rgba(212, 86, 74, 0.5)' : 'transparent',
            border: showFloodOverlay ? '2px dashed #c0392b' : '2px solid #4a5568',
          }}
        />
        <span className={`text-[10px] font-medium ${showFloodOverlay ? 'text-slate-200' : 'text-slate-500'} group-hover:text-white transition-colors`}>
          2026 Flood Areas
        </span>
        <span className="text-[8px] text-slate-600 ml-auto">observed</span>
      </button>
      {showFloodOverlay && (
        <div className="flex flex-col gap-0.5 mt-1 ml-6">
          <div className="flex items-center gap-1.5">
            <span
              className="w-4 shrink-0"
              style={{ height: 2, borderTop: '2px dashed #c0392b' }}
            />
            <span className="text-[9px] text-slate-500">Flood / landslide extent</span>
          </div>
          <span className="text-[8px] text-slate-600 italic">
            EMSR927 + HOT observed
          </span>
        </div>
      )}
    </div>
  );
}
