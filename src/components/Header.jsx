import React from "react";
import { Film, Settings } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-black/40 bg-black/70 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-indigo-500 to-sky-500 grid place-items-center">
            <Film className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Cinematic Parallax</h1>
            <p className="text-xs text-white/60">Turn a still image into a subtle looping motion scene</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          <Settings className="h-4 w-4" />
          <span className="text-xs">16:9 • 10–15s loop</span>
        </div>
      </div>
    </header>
  );
}
