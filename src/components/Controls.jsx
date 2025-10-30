import React, { useRef } from "react";
import { Upload, Volume2, VolumeX } from "lucide-react";

export default function Controls({ settings, onChange, onImageUpload, audioOn, setAudioOn, volume, setVolume }) {
  const fileRef = useRef(null);

  const set = (key, value) => onChange({ ...settings, [key]: value });

  const triggerUpload = () => fileRef.current?.click();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onImageUpload(f);
  };

  return (
    <aside className="p-4 space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/90">Source Image</h2>
        <div className="flex items-center gap-2">
          <button onClick={triggerUpload} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition text-sm inline-flex items-center gap-2">
            <Upload className="h-4 w-4" /> Upload Image
          </button>
          <input ref={fileRef} className="hidden" type="file" accept="image/*" onChange={onFile} />
        </div>
        <p className="text-xs text-white/50">Use a high-resolution landscape image for best depth.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white/90">Motion & Depth</h2>
        <LabeledSlider label="Push-In" value={settings.pushIn} min={0} max={1} step={0.01} onChange={(v) => set("pushIn", v)} />
        <LabeledSlider label="Pan" value={settings.pan} min={0} max={1} step={0.01} onChange={(v) => set("pan", v)} />
        <LabeledSlider label="Parallax Depth" value={settings.parallaxDepth} min={0} max={1.5} step={0.01} onChange={(v) => set("parallaxDepth", v)} />
        <LabeledSlider label="Wind" value={settings.wind} min={0} max={1} step={0.01} onChange={(v) => set("wind", v)} />
        <LabeledSlider label="Duration (s)" value={settings.duration} min={8} max={15} step={1} onChange={(v) => set("duration", v)} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-white/90">Atmosphere</h2>
        <LabeledSlider label="Dust Density" value={settings.particleDensity} min={0} max={1} step={0.01} onChange={(v) => set("particleDensity", v)} />
        <LabeledSlider label="Light Rays" value={settings.lightRays} min={0} max={1} step={0.01} onChange={(v) => set("lightRays", v)} />
        <LabeledSlider label="Depth of Field" value={settings.dofIntensity} min={0} max={1} step={0.01} onChange={(v) => set("dofIntensity", v)} />
        <LabeledSlider label="Brightness" value={settings.brightness} min={0.6} max={1.4} step={0.01} onChange={(v) => set("brightness", v)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white/90">Audio</h2>
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => setAudioOn(!audioOn)} className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition text-sm inline-flex items-center gap-2">
            {audioOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {audioOn ? "Ambient On" : "Ambient Off"}
          </button>
          <div className="flex-1">
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-full accent-indigo-400" />
          </div>
        </div>
        <p className="text-xs text-white/50">Soft drone and nature-like texture. No melody or dialogue.</p>
      </section>
    </aside>
  );
}

function LabeledSlider({ label, value, onChange, min, max, step }) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span className="tabular-nums text-white/50">{typeof value === "number" ? value.toFixed(2) : value}</span>
      </div>
      <input className="w-full accent-indigo-400" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}
