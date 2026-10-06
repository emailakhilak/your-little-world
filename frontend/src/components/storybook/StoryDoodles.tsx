import React from "react";

export function DoodleStoryBookIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Book Spine */}
      <path d="M24 10 V38" strokeWidth="2" />
      {/* Left Page Top & Bottom Curves */}
      <path d="M24 10 C18 7 10 8 6 11 V37 C10 34 18 33 24 38" />
      {/* Right Page Top & Bottom Curves */}
      <path d="M24 10 C30 7 38 8 42 11 V37 C38 34 30 33 24 38" />
      {/* Left Page Edge */}
      <path d="M6 11 V37" />
      {/* Right Page Edge */}
      <path d="M42 11 V37" />
      {/* Subtle sketched text lines on left page */}
      <path d="M10 17 C14 16 18 16 20 17" strokeWidth="1.2" opacity="0.6" />
      <path d="M10 22 C14 21 18 21 20 22" strokeWidth="1.2" opacity="0.6" />
      <path d="M10 27 C14 26 18 26 19 27" strokeWidth="1.2" opacity="0.6" />
      {/* Subtle sketched text lines on right page */}
      <path d="M28 17 C30 16 34 16 38 17" strokeWidth="1.2" opacity="0.6" />
      <path d="M28 22 C30 21 34 21 38 22" strokeWidth="1.2" opacity="0.6" />
      <path d="M28 27 C30 26 33 26 36 27" strokeWidth="1.2" opacity="0.6" />
      {/* Tiny bookmark ribbon dangling at bottom */}
      <path d="M24 38 C23 41 24 43 25 45 L26 43 L27 45 C26 43 25 41 24 38" strokeWidth="1.2" />
    </svg>
  );
}

export function DoodleDivider({ className = "w-48 sm:w-64 h-2.5" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 240 8" className="w-full h-full" fill="none">
        <path
          d="M 5 4 C 45 2, 85 6, 120 4 C 155 2, 195 6, 235 4"
          stroke="#2B2B32"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Tiny pencil knot in the center */}
        <path d="M 118 4 L 120 2 L 122 4 L 120 6 Z" stroke="#3E3E48" strokeWidth="1" fill="#141417" />
      </svg>
    </div>
  );
}

export function DoodleDividerFull({ className = "w-full max-w-2xl h-2" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center my-2 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 600 8" className="w-full h-full" fill="none">
        <path
          d="M 6 4 C 100 2, 200 6, 300 4 C 400 2, 500 6, 594 4"
          stroke="#2B2B32"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function DoodleQuill({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Quill feather shaft */}
      <path d="M26 4 C24 10 16 18 6 26 L5 27 L7 25 C14 17 21 8 26 4 Z" />
      <path d="M6 26 L4 28 L6 26" strokeWidth="2" />
      {/* Feather barbs */}
      <path d="M22 8 C18 10 17 14 16 16" strokeWidth="1" opacity="0.6" />
      <path d="M19 12 C15 14 14 18 13 20" strokeWidth="1" opacity="0.6" />
      <path d="M24 6 C20 7 19 11 18 13" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

export function DoodleSparkle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <path d="M10 2 C10 7 13 10 18 10 C13 10 10 13 10 18 C10 13 7 10 2 10 C7 10 10 10 10 2 Z" />
    </svg>
  );
}
