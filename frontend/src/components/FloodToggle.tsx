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
          className="w-3 h-3 rounded-sm border shrink-0"
          style={{
            backgroundColor: showFloodOverlay ? 'rgba(229, 62, 62, 0.35)' : 'transparent',
            borderColor: showFloodOverlay ? '#e53e3e' : '#4a5568',
          }}
        />
        <span className={`text-[10px] ${showFloodOverlay ? 'text-slate-200' : 'text-slate-500'} group-hover:text-white transition-colors`}>
          2026 Flood Areas
        </span>
        <span className="text-[8px] text-slate-600 ml-auto">observed</span>
      </button>
      {showFloodOverlay && (
        <div className="flex items-center gap-1.5 mt-1 ml-5">
          <span className="w-4 h-0.5 shrink-0" style={{ backgroundColor: '#e53e3e' }} />
          <span className="text-[9px] text-slate-500">Analysed flood/landslide extent</span>
        </div>
      )}
    </div>
  );
}
