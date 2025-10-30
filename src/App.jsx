import React, { useState, useCallback } from "react";
import Header from "./components/Header";
import ParallaxScene from "./components/ParallaxScene";
import Controls from "./components/Controls";
import AmbientAudio from "./components/AmbientAudio";

export default function App() {
  const [imageURL, setImageURL] = useState(
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=80"
  );
  const [settings, setSettings] = useState({
    pushIn: 0.4,
    pan: 0.25,
    parallaxDepth: 0.8,
    particleDensity: 0.7,
    lightRays: 0.35,
    dofIntensity: 0.6,
    duration: 12,
    wind: 0.35,
    brightness: 1.0,
  });
  const [audioOn, setAudioOn] = useState(true);
  const [volume, setVolume] = useState(0.15);

  const handleImageUpload = useCallback((file) => {
    const url = URL.createObjectURL(file);
    setImageURL(url);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />
      <div className="relative flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 bg-black/90">
          <ParallaxScene imageURL={imageURL} settings={settings} />
        </div>
        <div className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-white/10 bg-neutral-950/60">
          <Controls
            settings={settings}
            onChange={setSettings}
            onImageUpload={handleImageUpload}
            audioOn={audioOn}
            setAudioOn={setAudioOn}
            volume={volume}
            setVolume={setVolume}
          />
        </div>
      </div>
      <AmbientAudio enabled={audioOn} volume={volume} />
    </div>
  );
}
