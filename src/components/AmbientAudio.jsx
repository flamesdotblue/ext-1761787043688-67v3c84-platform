import React, { useEffect, useRef } from "react";

export default function AmbientAudio({ enabled = true, volume = 0.15 }) {
  const ctxRef = useRef(null);
  const gainRef = useRef(null);

  useEffect(() => {
    // lazy init
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      // Pink-ish noise source
      const bufferSize = 4096;
      const node = ctx.createScriptProcessor(bufferSize, 1, 1);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      node.onaudioprocess = function(e) {
        const out = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          b6 = white * 0.115926;
          out[i] = pink * 0.05; // base level
        }
      };

      // Low-pass for softness
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 1600;
      // Slow LFO to subtly modulate tone
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.02; // very slow
      lfoGain.gain.value = 400; // mod depth
      lfo.connect(lfoGain).connect(lowpass.frequency);
      lfo.start();

      // Gentle stereo widening via short delay
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.08;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.25;
      delay.connect(feedback).connect(delay);

      node.connect(lowpass).connect(delay).connect(master);

      node.connect(master); // dry

      node.connect(ctx.destination); // keep audio running on some mobile browsers

      node.connect(master);

      ctxRef.current = ctx;
      gainRef.current = master;
    }

    if (ctxRef.current && gainRef.current) {
      if (enabled) {
        if (ctxRef.current.state === "suspended") ctxRef.current.resume();
        smoothTo(gainRef.current.gain, volume, 0.8);
      } else {
        smoothTo(gainRef.current.gain, 0.0, 0.8);
      }
    }

    return () => {};
  }, [enabled, volume]);

  return null;
}

function smoothTo(param, value, time = 0.5) {
  const now = (param.context || window.__audioCtx || {}).currentTime || 0;
  try {
    param.cancelScheduledValues(now);
    param.linearRampToValueAtTime(value, now + time);
  } catch {
    param.value = value;
  }
}
