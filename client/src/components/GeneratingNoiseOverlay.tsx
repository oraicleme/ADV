/**
 * Animated loading overlay with visual "noise" effect during ad generation.
 * Creates a cinematic, professional loading experience.
 */

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export function GeneratingNoiseOverlay() {
  const [noiseKey, setNoiseKey] = useState(0);

  // Refresh noise pattern every 100ms for animated effect
  useEffect(() => {
    const interval = setInterval(() => {
      setNoiseKey((k) => k + 1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Noise background */}
      <div
        key={noiseKey}
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' result='noise'/%3E%3C/filter%3E%3Crect width='400' height='400' fill='%23fff' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Content card */}
      <div className="relative z-10 flex flex-col items-center gap-6 rounded-2xl border border-orange-500/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-12 py-8 shadow-2xl shadow-orange-500/20">
        {/* Animated icon */}
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-orange-500/20 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500">
            <Sparkles className="h-8 w-8 animate-spin text-white" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center">
          <h3 className="mb-2 text-lg font-bold text-white">Creating Your Ad</h3>
          <p className="text-sm text-gray-400">AI is designing your perfect promotional creative...</p>
        </div>

        {/* Progress bar with animated gradient */}
        <div className="w-48 overflow-hidden rounded-full bg-white/10 p-0.5">
          <div className="h-1 rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 animate-pulse" />
        </div>

        {/* Animated dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-orange-400 animate-bounce"
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
