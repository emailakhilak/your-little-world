import React from "react";

export function DoodleCandleIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Candle Flame */}
      <path
        d="M20 7 C18 10 17 12 18 14 C19 16 21 16 22 14 C23 12 22 10 20 7 Z"
        fill="#EAE6DF"
        stroke="#EAE6DF"
      />
      {/* Wick */}
      <path d="M20 14 V17" stroke="#8E8E93" strokeWidth="1.2" />
      {/* Candle Body */}
      <path d="M15 17 H25 V33 C25 34 24 35 23 35 H17 C16 35 15 34 15 33 Z" />
      {/* Little wax drip */}
      <path d="M18 17 V22 C18 23 19 23 19 22 V17" strokeWidth="1.2" />
      {/* Candle holder base plate */}
      <path d="M11 35 C11 35 15 34 20 34 C25 34 29 35 29 35" strokeWidth="1.8" />
      <path d="M13 37 H27" strokeWidth="1.4" opacity="0.6" />
    </svg>
  );
}

export function DoodleAtticDivider({ className = "w-full max-w-2xl h-2" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center my-3 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 500 8" className="w-full h-full" fill="none">
        <path
          d="M 5 4 C 80 2, 160 6, 250 4 C 340 2, 420 6, 495 4"
          stroke="#2B2B32"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Tiny pencil diamond in the center */}
        <path d="M 248 4 L 250 2 L 252 4 L 250 6 Z" stroke="#3E3E48" strokeWidth="1" fill="#141417" />
      </svg>
    </div>
  );
}
