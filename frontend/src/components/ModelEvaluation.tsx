import { useForecastStore } from '../data/ForecastStore';

/** Metric definition row for the "How to read these metrics" section. */
function MetricDef({ name, full, desc }: { name: string; full: string; desc: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-x-2 py-0.5">
      <span className="text-slate-200 font-mono font-semibold text-[10px]">{name}</span>
      <span className="text-slate-400 text-[10px]">
        <span className="text-slate-300">{full}</span> — {desc}
      </span>
    </div>
  );
}

export function ModelEvaluation() {
  const showModelEvaluation = useForecastStore((s) => s.showModelEvaluation);
  const toggleModelEvaluation = useForecastStore((s) => s.toggleModelEvaluation);
  const metadata = useForecastStore((s) => s.metadata);

  if (!showModelEvaluation) return null;

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) toggleModelEvaluation(); }}
    >
      <div className="bg-wx-panel border border-wx-border rounded-lg max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col shadow-2xl">

        {/* Modal header */}
        <div className="flex items-start justify-between px-5 py-3 border-b border-wx-border shrink-0">
          <div>
            <h2 className="text-sm font-bold text-white">Model Evaluation</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Aurora 1.5 — Nepal forecast evaluation context
            </p>
          </div>
          <button
            onClick={toggleModelEvaluation}
            className="text-slate-400 hover:text-white transition-colors text-xl leading-none px-1 ml-3 shrink-0"
            title="Close"
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 text-[11px] text-slate-300">

          {/* ── Verification unavailable notice ──────────────── */}
          <div className="bg-amber-950/40 border border-amber-700/60 rounded p-3 space-y-1.5">
            <p className="text-amber-300 font-semibold text-[10px] uppercase tracking-wide">
              Verification metrics unavailable
            </p>
            <p className="text-[10px] text-amber-200/75 leading-relaxed">
              This Nepal forecast does not include independent observation or reanalysis
              verification data. No MAE, RMSE, bias, POD, FAR, or CSI scores have been
              computed for this dataset.
            </p>
            <p className="text-[10px] text-amber-200/55 leading-relaxed">
              The forecast was generated using Aurora 1.5 initialized from IFS open data.
              Verification against ERA5 or station observations would require a separate
              evaluation pipeline that has not been run for this initialization.
            </p>
          </div>

          {/* ── Model provenance ─────────────────────────────── */}
          {metadata && (
            <div className="text-[10px] text-slate-500 grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>Model: {metadata.model}{metadata.model_version ? ` ${metadata.model_version}` : ''}</span>
              <span>Resolution: {metadata.native_resolution_deg}°</span>
              <span>Init: {metadata.initialization_time}</span>
              <span>Step: {metadata.native_timestep_hours}h · Frames: {metadata.n_frames} · Horizon: {metadata.forecast_horizon_hours}h</span>
              <span>IC source: {metadata.initialization_source}</span>
              <span>Region: {metadata.region}</span>
            </div>
          )}

          <hr className="border-slate-700/60" />

          {/* ── Model context ────────────────────────────────── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-3 space-y-2">
            <p className="text-slate-200 font-semibold text-[10px] uppercase tracking-wide">
              About Aurora 1.5
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Aurora is a foundation model for Earth system forecasting developed by Microsoft Research.
              Version 1.5 operates at 0.25° resolution and produces hourly forecasts up to 168 hours (7 days).
              It was trained on a combination of ERA5 reanalysis and HRES operational analysis data.
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              This forecast was initialized using IFS open data from ECMWF. Four input channels
              (sic, hcc, lcc, mcc) were unavailable in the IFS open data product and were zero-filled.
              This may affect cloud-related predictions.
            </p>
          </div>

          {/* ── How to read these metrics ────────────────────── */}
          <div className="bg-slate-800/50 border border-slate-700 rounded p-3">
            <p className="text-slate-200 font-semibold text-[10px] uppercase tracking-wide mb-2">
              Metric definitions (for reference)
            </p>
            <p className="text-[10px] text-slate-500 mb-2 italic">
              These metrics are not computed for this dataset. They are provided here for
              reference, in case verification data becomes available in the future.
            </p>
            <div className="space-y-0.5">
              <MetricDef name="MAE"
                full="Mean Absolute Error"
                desc="average magnitude of the forecast error, in the variable's unit. Lower is better." />
              <MetricDef name="RMSE"
                full="Root Mean Square Error"
                desc="like MAE but penalises large individual errors more strongly. Lower is better." />
              <MetricDef name="Bias"
                full="Mean signed error"
                desc="systematic over- or under-prediction. Negative = model colder/weaker/drier than reference; positive = warmer/stronger/wetter. 0 is ideal." />
              <MetricDef name="Circ. MAE"
                full="Circular Mean Absolute Error"
                desc="average angular error for wind direction, using the shortest path around the compass (avoids the 0°/360° wrap). Lower is better." />
              <MetricDef name="POD"
                full="Probability of Detection"
                desc="fraction of rain events that the reference observed and the model also forecast. Higher is better; 1.0 = all events detected." />
              <MetricDef name="FAR"
                full="False Alarm Ratio"
                desc="fraction of forecast rain events that the reference did not observe. Lower is better; 0 = no false alarms." />
              <MetricDef name="CSI"
                full="Critical Success Index"
                desc="combined score: hits / (hits + misses + false alarms). Accounts for both missed events and false alarms. Higher is better; 1.0 = perfect." />
            </div>
          </div>

          {/* ── Nepal-specific considerations ────────────────── */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded p-3 text-[10px] text-slate-400 leading-relaxed space-y-1">
            <p className="text-slate-300 font-semibold">Nepal-specific considerations</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Nepal spans extreme elevation gradients (60m Terai to 8,849m Everest).
                A 0.25° grid (~28 km) cannot resolve valley-scale or orographic weather effects.
              </li>
              <li>
                August is peak monsoon season in Nepal. Convective precipitation is highly
                localized and difficult for global models to predict at grid scale.
              </li>
              <li>
                The forecast domain (26.0–30.5°N, 80.0–88.5°E) extends slightly beyond Nepal's
                borders to provide spatial context but may include non-Nepal terrain.
              </li>
              <li>
                Wind patterns in mountain valleys are strongly influenced by local topography
                that this resolution cannot capture. Surface wind forecasts should be interpreted
                as synoptic-scale guidance only.
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
