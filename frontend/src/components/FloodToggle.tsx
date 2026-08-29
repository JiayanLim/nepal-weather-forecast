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
            backgroundColor: showFloodOverlay ? 'rgba(192, 57, 43, 0.55)' : 'transparent',
            border: showFloodOverlay ? '2px solid #922b21' : '2px solid #4a5568',
          }}
        />
        <span className={`text-[10px] font-medium ${showFloodOverlay ? 'text-slate-200' : 'text-slate-500'} group-hover:text-white transition-colors`}>
          2026 Flood Areas
        </span>
      </button>
      {showFloodOverlay && (
        <div className="flex flex-col gap-1 mt-1.5 ml-6">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-2 rounded-sm shrink-0"
              style={{ backgroundColor: 'rgba(192, 57, 43, 0.55)', border: '1px solid #922b21' }}
            />
            <span className="text-[9px] text-slate-500">Observed flood / landslide</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: '#c0392b', border: '1.5px solid #fff' }}
            />
            <span className="text-[9px] text-slate-500">Key affected locations</span>
          </div>
          <span className="text-[8px] text-slate-600 italic">
            EMSR927 + HOT · observed extent
          </span>
        </div>
      )}
    </div>
  );
}
