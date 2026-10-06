import React from "react";

interface DoodleCheckboxProps {
  checked: boolean;
  className?: string;
}

/**
 * Subtle hand-drawn doodle-style checkbox (☐ or ☑).
 * Features an organic sketched square with a handwritten tick when checked.
 */
export function DoodleCheckbox({
  checked,
  className = "w-5 h-5",
}: DoodleCheckboxProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`${className} overflow-visible transition-colors`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Hand-drawn organic sketch square outline */}
      <path
        d="M 3.5 3.2 C 8 2.5, 13.5 3.2, 16.5 3 C 17.2 7.5, 16.8 12.5, 17 16.5 C 12.5 17.2, 7.5 16.8, 3.5 17 C 2.8 12.5, 3.2 7.5, 3.5 3.2"
        strokeWidth="1.6"
        stroke="currentColor"
      />
      {/* Hand-drawn organic checkmark tick if checked */}
      {checked && (
        <path
          d="M 4.2 10.5 C 5.8 12.2, 7.2 13.8, 8.5 15.2 C 10.8 11.2, 13.5 7, 16.8 4"
          strokeWidth="2.2"
          stroke="currentColor"
        />
      )}
    </svg>
  );
}

/**
 * Distinct hand-drawn checkbox specifically for multi-selection mode.
 * Visually differentiates selection from completion checkboxes with notebook ink styling.
 */
export function DoodleSelectCheckbox({
  selected,
  className = "w-5 h-5",
}: {
  selected: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`${className} overflow-visible transition-colors`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Hand-drawn sketched box outline */}
      <path
        d="M 3.8 3.5 C 7.5 3.0, 12.5 3.3, 16.2 3.2 C 16.8 7.0, 16.5 12.0, 16.6 16.2 C 12.5 16.6, 7.5 16.4, 3.6 16.5 C 3.2 12.0, 3.4 7.2, 3.8 3.5"
        strokeWidth="1.6"
        stroke="currentColor"
      />
      {/* Hand-drawn chalk/ink checkmark when selected */}
      {selected && (
        <path
          d="M 5.2 10.2 C 6.5 11.8, 7.8 13.4, 9.0 14.5 C 11.2 10.5, 13.8 6.5, 16.5 4.2"
          strokeWidth="2.2"
          stroke="currentColor"
        />
      )}
    </svg>
  );
}

/**
 * Hand-written organic scratch-through stroke drawn across completed goal titles.
 */
export function DoodleScratchThrough({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[103%] h-3 pointer-events-none overflow-visible -ml-[1.5%] ${className}`}
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      {/* Primary sketchy scratch stroke */}
      <path
        d="M 1 6 C 48 3.8, 98 7.6, 148 5 C 172 4.2, 188 6.5, 199 5.2"
        stroke="#7A8B74"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Secondary pencil fiber for natural notebook feel */}
      <path
        d="M 3 6.8 C 55 5.5, 115 7.8, 197 5.8"
        stroke="#86A868"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/**
 * Subtle hand-drawn doodle pencil icon (✎) for editing goals.
 */
export function DoodleEditIcon({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`${className} overflow-visible`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Doodle pencil body and tip */}
      <path d="M 13.5 3.5 L 16.5 6.5 L 6.5 16.5 L 3 17 L 3.5 13.5 Z" />
      <path d="M 11.5 5.5 L 14.5 8.5" />
      <path d="M 6.5 16.5 L 3.5 13.5" />
    </svg>
  );
}

/**
 * Subtle hand-drawn doodle trash icon (🗑) for deleting goals.
 */
export function DoodleDeleteIcon({
  className = "w-4 h-4",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`${className} overflow-visible`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Doodle trash lid, handle, and basket */}
      <path d="M 3.5 6 H 16.5" />
      <path d="M 7.5 6 V 3.8 C 7.5 3.3, 8 3, 8.5 3 H 11.5 C 12 3, 12.5 3.3, 12.5 3.8 V 6" />
      <path d="M 5 6 L 6 16.5 C 6.1 17, 6.6 17.5, 7.2 17.5 H 12.8 C 13.4 17.5, 13.9 17, 14 16.5 L 15 6" />
      <path d="M 8.2 9.5 V 14" />
      <path d="M 11.8 9.5 V 14" />
    </svg>
  );
}

/**
 * Hand-drawn horizontal divider line for notebook sections.
 */
export function DoodleGardenDivider({
  className = "w-full my-4",
}: {
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 500 8" className="w-full h-2" fill="none">
        <path
          d="M 5 4 C 90 2.5, 170 5.5, 250 4 C 330 2.5, 410 5.5, 495 4"
          stroke="#2B2B32"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* Tiny center sketch mark */}
        <path
          d="M 248 4 C 248 1, 252 1, 252 4"
          stroke="#44444C"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/**
 * Hand-drawn border SVG overlay for the single notebook container.
 */
export function DoodleNotebookBorder({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-visible ${className}`}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      {/* Main sketchy outer frame */}
      <path
        d="M 14 14 C 250 11, 500 16, 986 14 C 989 300, 984 600, 986 986 C 700 989, 350 984, 14 986 C 11 650, 16 350, 14 14 Z"
        stroke="#2B2B32"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Subtle secondary pen trace */}
      <path
        d="M 18 18 C 300 16, 600 19, 982 17 C 985 350, 981 700, 982 982 C 650 984, 300 981, 18 982 C 16 600, 19 300, 18 18 Z"
        stroke="#1E1E22"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/**
 * Pen circle around period navigation labels: ( Daily ) ( Weekly ) etc.
 */
export function DoodlePenCircle({
  active = false,
}: {
  active?: boolean;
}) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible -m-0.5"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      {active ? (
        <>
          {/* Stronger hand-drawn pen circle for active */}
          <path
            d="M 10 20 C 10 9, 26 5, 50 5 C 76 5, 90 9, 90 20 C 90 31, 74 35, 50 35 C 24 35, 10 31, 10 20 C 11 13, 22 7, 46 6"
            stroke="#EAE6DF"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M 13 22 C 12 12, 28 7, 52 7 C 76 7, 88 11, 87 21 C 86 30, 70 33, 48 33 C 26 33, 12 29, 13 22"
            stroke="#8E8E93"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
        </>
      ) : (
        <path
          d="M 10 20 C 10 10, 26 6, 50 6 C 74 6, 90 10, 90 20 C 90 30, 74 34, 50 34 C 24 34, 10 30, 10 20"
          stroke="#2B2B32"
          strokeWidth="1.2"
          strokeLinecap="round"
          className="group-hover:stroke-[#44444C] transition-colors"
        />
      )}
    </svg>
  );
}

/**
 * Hand-drawn (+) add intention button symbol.
 */
export function DoodleAddIcon({
  className = "w-5 h-5",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} overflow-visible`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Hand-drawn sketched circle */}
      <path
        d="M 12 3 C 17.2 2.7, 21.2 6.8, 21 12 C 20.8 17.2, 16.8 21.2, 12 21 C 6.8 20.8, 2.8 16.8, 3 12 C 3.2 6.8, 7.2 2.8, 12 3"
        strokeWidth="1.5"
      />
      {/* Sketched plus */}
      <path d="M 12 7.5 V 16.5" strokeWidth="1.5" />
      <path d="M 7.5 12 H 16.5" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Quiet hand-drawn seedling emblem for the notebook header.
 */
export function DoodleSeedling({
  className = "w-6 h-6",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} overflow-visible`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Stem */}
      <path d="M 12 21 C 12 15, 11 11, 12 6" strokeWidth="1.6" />
      {/* Left leaf */}
      <path
        d="M 12 11 C 7 10, 5 13, 6 16 C 9 17, 12 14, 12 11 Z"
        strokeWidth="1.4"
      />
      {/* Right leaf */}
      <path
        d="M 12 8 C 17 6, 19 9, 18 12 C 15 13, 12 10, 12 8 Z"
        strokeWidth="1.4"
      />
      {/* Small ground curve */}
      <path d="M 8 21 C 10 20.5, 14 20.5, 16 21" strokeWidth="1.5" />
    </svg>
  );
}
