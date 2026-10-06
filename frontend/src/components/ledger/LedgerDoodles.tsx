import React from "react";

export function DoodleLedgerBook({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Notebook spine & cover */}
      <path
        d="M16 10 C16 8, 18 8, 20 8 L48 8 C50 8, 52 10, 52 12 L52 52 C52 54, 50 56, 48 56 L20 56 C18 56, 16 54, 16 52 Z"
        strokeWidth="1.6"
      />
      {/* Spine stitching */}
      <path d="M22 8 L22 56" strokeWidth="1.2" strokeDasharray="3 3" />
      <path d="M16 18 L22 18 M16 32 L22 32 M16 46 L22 46" strokeWidth="1.4" />
      {/* Little receipt paper tucked in */}
      <path
        d="M28 6 L44 6 L44 26 L40 24 L36 26 L32 24 L28 26 Z"
        strokeWidth="1.3"
        strokeDasharray="1 1"
      />
      {/* Subtle notebook lines */}
      <path d="M28 32 L46 32" strokeWidth="1.1" strokeOpacity="0.6" />
      <path d="M28 38 L42 38" strokeWidth="1.1" strokeOpacity="0.6" />
      <path d="M28 44 L45 44" strokeWidth="1.1" strokeOpacity="0.6" />
      <path d="M28 50 L38 50" strokeWidth="1.1" strokeOpacity="0.6" />
      {/* Tiny sketched coin */}
      <circle cx="45" cy="48" r="4.5" strokeWidth="1.3" />
      <path d="M45 46 L45 50 M44 47.5 L46 47.5" strokeWidth="1" />
    </svg>
  );
}

export function DoodleSearchGlass({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" strokeWidth="1.6" />
      <path d="M16 16 L21 21" strokeWidth="1.8" />
    </svg>
  );
}

export function DoodlePlus({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5 L12 19" strokeWidth="1.8" />
      <path d="M5 12 L19 12" strokeWidth="1.8" />
    </svg>
  );
}

export function DoodlePencil({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18.5 2.5 L21.5 5.5 L7.5 19.5 L3 21 L4.5 16.5 Z" strokeWidth="1.5" />
      <path d="M15 6 L18 9" strokeWidth="1.3" />
    </svg>
  );
}

export function DoodleTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7 L20 7" strokeWidth="1.5" />
      <path d="M10 11 L10 17 M14 11 L14 17" strokeWidth="1.4" />
      <path d="M6 7 L7 20 C7 21 8 21.5 9 21.5 L15 21.5 C16 21.5 17 21 17 20 L18 7" strokeWidth="1.5" />
      <path d="M9 7 L9 4 C9 3.5 9.5 3 10 3 L14 3 C14.5 3 15 3.5 15 4 L15 7" strokeWidth="1.5" />
    </svg>
  );
}

export function DoodleLedgerDivider({ className = "w-full" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 12"
      className={className}
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        d="M 5 6 C 50 4, 100 8, 150 5 C 200 7, 250 4, 300 6 C 350 7, 395 5, 395 5"
        strokeWidth="1.2"
        strokeDasharray="4 6"
        strokeLinecap="round"
      />
    </svg>
  );
}
