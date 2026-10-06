import React from "react";

/**
 * Hand-drawn 4-point star doodle.
 */
export function DoodleTitleStar({ className = "w-4 h-4 text-[#8E8E93]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} overflow-visible select-none inline-block`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path
        d="M 12 2 C 12 8, 15 12, 22 12 C 15 12, 12 16, 12 22 C 12 16, 9 12, 2 12 C 9 12, 12 8, 12 2 Z"
        strokeWidth="1.6"
      />
    </svg>
  );
}

/**
 * Hand-drawn imperfect pencil underline.
 */
export function DoodleTitleUnderline({ className = "w-40 sm:w-56 h-3 text-[#3E3E48]" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 12"
      className={`${className} overflow-visible select-none`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path
        d="M 4 8 C 45 4.5, 95 9.5, 145 5.5 C 185 3, 215 7.5, 236 6"
        strokeWidth="1.6"
      />
      {/* Secondary faint pencil trace */}
      <path
        d="M 12 9 C 55 6, 110 9, 180 6.5 C 205 5.5, 225 7, 232 6.5"
        strokeWidth="1"
        opacity="0.4"
      />
    </svg>
  );
}

/**
 * Delicate horizontal pencil divider line for notebook sections.
 */
export function DoodleNotebookDivider({ className = "w-full my-6 text-[#2B2B32]" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 600 10" className="w-full h-2.5 overflow-visible" fill="none">
        <path
          d="M 6 5 C 100 3, 200 7, 300 5 C 400 3, 500 7, 594 5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        {/* Subtle center pencil mark */}
        <path
          d="M 298 5 L 300 2 L 302 5 L 300 8 Z"
          stroke="#44444C"
          strokeWidth="1"
          fill="#0E0E10"
        />
      </svg>
    </div>
  );
}

/**
 * Central Living Room Vignette:
 * Hand-drawn sketched hearth & resting space in the center of the world.
 * Woven rug, tea table, steaming cup, small lantern with flickering flame, comfy armchair silhouette.
 */
export function DoodleLivingRoomCenter({ className = "w-44 h-36" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 140"
      className={`${className} overflow-visible select-none animate-breathe`}
      fill="none"
      stroke="#EAE6DF"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Hand-drawn sketchy oval rug */}
      <ellipse
        cx="90"
        cy="106"
        rx="68"
        ry="22"
        stroke="#3E3E48"
        strokeWidth="1.3"
        strokeDasharray="4 3"
      />
      <ellipse
        cx="90"
        cy="106"
        rx="58"
        ry="18"
        stroke="#24242A"
        strokeWidth="1"
      />
      {/* Rug fringe lines */}
      <path d="M 22 106 L 18 108 M 24 109 L 20 112 M 158 106 L 162 108 M 156 109 L 160 112" stroke="#3E3E48" strokeWidth="1.2" />

      {/* Armchair silhouette behind table */}
      {/* Chair Back */}
      <path
        d="M 54 84 C 52 60 62 48 90 48 C 118 48 128 60 126 84"
        stroke="#77777D"
        strokeWidth="1.5"
      />
      {/* Cushion tufting texture */}
      <path d="M 76 56 C 80 62 82 68 82 74" stroke="#3E3E48" strokeWidth="1" strokeDasharray="2 3" />
      <path d="M 104 56 C 100 62 98 68 98 74" stroke="#3E3E48" strokeWidth="1" strokeDasharray="2 3" />
      {/* Left armrest */}
      <path
        d="M 48 78 C 46 74 50 70 56 72 L 58 84 C 56 88 50 86 48 78 Z"
        stroke="#77777D"
        strokeWidth="1.3"
      />
      {/* Right armrest */}
      <path
        d="M 132 78 C 134 74 130 70 124 72 L 122 84 C 124 88 130 86 132 78 Z"
        stroke="#77777D"
        strokeWidth="1.3"
      />

      {/* Cozy hearth / low wooden tea table */}
      <path
        d="M 64 92 L 116 92 C 120 92 123 94 120 97 L 114 103 H 66 L 60 97 C 57 94 60 92 64 92 Z"
        stroke="#8E8E93"
        strokeWidth="1.4"
        fill="#0E0E10"
      />
      {/* Table legs */}
      <path d="M 66 103 L 63 112" stroke="#8E8E93" strokeWidth="1.4" />
      <path d="M 114 103 L 117 112" stroke="#8E8E93" strokeWidth="1.4" />

      {/* Steaming mug of tea on table */}
      <path
        d="M 74 86 H 84 V 92 C 84 93.5 83 94.5 81.5 94.5 H 76.5 C 75 94.5 74 93.5 74 92 Z"
        stroke="#EAE6DF"
        strokeWidth="1.3"
      />
      <path d="M 84 87 C 86.5 87 87 89.5 85.5 91" stroke="#EAE6DF" strokeWidth="1.1" />
      {/* Steam trail */}
      <path
        d="M 77 82 C 76 79 79 77 78 74"
        stroke="#8E8E93"
        strokeWidth="1.1"
        opacity="0.7"
      />
      <path
        d="M 81 81 C 80 78 83 76 82 73"
        stroke="#8E8E93"
        strokeWidth="1.1"
        opacity="0.5"
      />

      {/* Cozy table lantern / candle */}
      <path d="M 100 83 H 108 V 92 H 100 Z" stroke="#EAE6DF" strokeWidth="1.3" />
      <path d="M 104 83 V 80" stroke="#8E8E93" strokeWidth="1.1" />
      {/* Flame with subtle flicker */}
      <g className="animate-flicker">
        <path
          d="M 104 75 C 102 77.5 102 79 103 80 C 103.5 80.5 104.5 80.5 105 80 C 106 79 106 77.5 104 75 Z"
          stroke="#F5F5F5"
          strokeWidth="1.2"
          fill="#EAE6DF"
        />
        <circle cx="104" cy="78" r="5" stroke="#3E3E48" strokeWidth="0.8" opacity="0.4" strokeDasharray="1 2" />
      </g>

      {/* Tiny slippers resting on the rug */}
      <ellipse cx="72" cy="115" rx="4.5" ry="2.5" stroke="#77777D" strokeWidth="1" />
      <ellipse cx="83" cy="115" rx="4.5" ry="2.5" stroke="#77777D" strokeWidth="1" />

      {/* Tiny floating dust speckles */}
      <circle cx="56" cy="42" r="0.7" fill="#8E8E93" />
      <circle cx="126" cy="40" r="0.8" fill="#8E8E93" />
      <path d="M 88 38 L 90 38 M 89 37 L 89 39" stroke="#8E8E93" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * Garden of Tomorrow Destination:
 * Hand-drawn terracotta pot with growing sprout and swaying leaves.
 */
export function DoodleGardenSprout({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} overflow-visible select-none`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Ground rest curve */}
      <path d="M 22 84 C 38 82, 62 82, 78 84" stroke="#3E3E48" strokeWidth="1.3" />

      {/* Terracotta pot */}
      <path
        d="M 34 58 H 66 V 63 C 66 64 65 65 64 65 H 36 C 35 65 34 64 34 63 Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M 37 65 L 42 82 C 42.5 83.5 44 84 46 84 H 54 C 56 84 57.5 83.5 58 82 L 63 65"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <ellipse cx="50" cy="62" rx="11" ry="2" stroke="#55555E" strokeWidth="1" strokeDasharray="2 2" />

      {/* Growing sprout with animated sway */}
      <g className="animate-sway origin-bottom">
        {/* Main stem */}
        <path
          d="M 50 60 C 50 48, 52 38, 48 24"
          stroke="currentColor"
          strokeWidth="1.8"
        />

        {/* Lower Left Leaf */}
        <g className="animate-leaf origin-bottom-left">
          <path
            d="M 49 46 C 36 44, 28 49, 26 56 C 34 58, 44 54, 49 47"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path d="M 47 48 C 39 49, 32 53, 28 55" stroke="#77777D" strokeWidth="1" />
        </g>

        {/* Right Middle Leaf */}
        <path
          d="M 50 38 C 62 34, 72 38, 76 45 C 68 49, 58 45, 50 39"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path d="M 52 38 C 60 38, 68 42, 73 44" stroke="#77777D" strokeWidth="1" />

        {/* Top Budding Leaves */}
        <path
          d="M 48 24 C 44 18, 46 12, 49 9 C 52 13, 52 19, 48 24 Z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M 48 24 C 52 20, 58 16, 62 16 C 60 21, 56 24, 48 24 Z"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      </g>

      {/* Tiny companion star */}
      <g className="animate-twinkle">
        <path d="M 72 20 L 74 20 M 73 19 L 73 21" stroke="#8E8E93" strokeWidth="1" />
      </g>
    </svg>
  );
}

/**
 * The Little Attic Destination:
 * Vintage brass candlestick with flickering flame, quill, and folded manuscript notes.
 */
export function DoodleAtticCandle({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} overflow-visible select-none`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Desk surface */}
      <path d="M 18 84 C 36 83, 64 83, 82 84" stroke="#3E3E48" strokeWidth="1.3" />

      {/* Stack of idea notes */}
      <g className="transition-transform duration-300 group-hover:-translate-y-0.5">
        <path d="M 22 80 L 52 78 L 54 83 L 24 85 Z" stroke="#55555E" strokeWidth="1.2" fill="#0E0E10" />
        <path d="M 24 76 L 50 74 L 52 80 L 26 82 Z" stroke="#77777D" strokeWidth="1.3" fill="#0E0E10" />
        <path d="M 26 71 L 48 69 L 51 76 L 27 78 Z" stroke="currentColor" strokeWidth="1.4" fill="#0E0E10" />
        <path d="M 48 69 L 45 73 L 51 73" stroke="#8E8E93" strokeWidth="1" />
        <path d="M 30 74 L 40 73" stroke="#8E8E93" strokeWidth="1" strokeDasharray="1.5 1.5" />
      </g>

      {/* Candlestick */}
      <ellipse cx="68" cy="80" rx="14" ry="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 68 76 V 80" stroke="currentColor" strokeWidth="1.4" />
      <rect x="65" y="48" width="6" height="28" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 65 54 C 64 56 64 58 65 59" stroke="#8E8E93" strokeWidth="1.1" />
      <path d="M 68 48 V 44" stroke="#8E8E93" strokeWidth="1.1" />

      {/* Flickering candle flame */}
      <g className="animate-flicker origin-bottom">
        <path
          d="M 68 34 C 65 38 64 41 66 43 C 67 44.5 69 44.5 70 43 C 72 41 71 38 68 34 Z"
          stroke="#F5F5F5"
          strokeWidth="1.4"
          fill="currentColor"
        />
        <circle cx="68" cy="40" r="8" stroke="#44444C" strokeWidth="0.8" opacity="0.4" strokeDasharray="2 2" />
      </g>

      {/* Feather quill */}
      <path
        d="M 44 76 C 42 60 48 44 54 36"
        stroke="#8E8E93"
        strokeWidth="1.4"
      />
      <path d="M 52 40 C 48 44 46 48 45 52" stroke="#55555E" strokeWidth="1" />
      <path d="M 54 36 L 52 44" stroke="#55555E" strokeWidth="1" />

      {/* Sparkle */}
      <g className="animate-sparkle">
        <path d="M 30 52 L 32 52 M 31 51 L 31 53" stroke="#8E8E93" strokeWidth="1" />
      </g>
    </svg>
  );
}

/**
 * The Moon Room Destination:
 * Floating crescent moon in night sky with twinkling stars and starlight cloud.
 */
export function DoodleMoonCrescent({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} overflow-visible select-none`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Horizon curve */}
      <path d="M 18 84 C 36 82, 64 82, 82 84" stroke="#3E3E48" strokeWidth="1.3" />

      {/* Floating crescent moon */}
      <g className="animate-float">
        <path
          d="M 58 20 C 42 22, 30 36, 32 52 C 34 66, 46 76, 62 72 C 48 71, 38 58 40 44 C 41 33 48 24 58 20 Z"
          stroke="currentColor"
          strokeWidth="1.7"
          fill="#0E0E10"
        />
        <circle cx="42" cy="44" r="1.2" stroke="#55555E" strokeWidth="0.8" />
        <circle cx="46" cy="56" r="1.5" stroke="#55555E" strokeWidth="0.8" />
        <circle cx="52" cy="64" r="1" stroke="#55555E" strokeWidth="0.8" />
      </g>

      {/* Twinkling stars */}
      <g className="animate-twinkle">
        <path
          d="M 68 28 C 68 31, 70 33, 73 33 C 70 33, 68 35, 68 38 C 68 35, 66 33, 63 33 C 66 33, 68 31, 68 28 Z"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <circle cx="28" cy="38" r="1" fill="#8E8E93" />
        <path d="M 76 56 L 78 56 M 77 55 L 77 57" stroke="#8E8E93" strokeWidth="1" />
      </g>

      {/* Soft night cloud doodle */}
      <path
        d="M 28 76 C 28 72 32 68 36 68 C 38 65 43 64 46 67 C 49 65 54 66 56 70 C 60 70 63 73 62 76"
        stroke="#44444C"
        strokeWidth="1.2"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

/**
 * The StoryBook Destination:
 * Open illustrated chronicle tome with text lines and waving bookmark ribbon.
 */
export function DoodleStorybookOpen({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} overflow-visible select-none`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Bookshelf curve */}
      <path d="M 18 84 C 36 82, 64 82, 82 84" stroke="#3E3E48" strokeWidth="1.3" />

      {/* Open Book */}
      <g className="transition-transform duration-300 group-hover:-translate-y-0.5">
        {/* Spine */}
        <path d="M 50 42 V 76" stroke="#8E8E93" strokeWidth="1.5" />

        {/* Thickness blocks */}
        <path d="M 22 47 V 74 C 32 71, 42 70, 50 76 V 79 C 42 73, 32 74, 22 77 Z" stroke="#55555E" strokeWidth="1.1" fill="#0E0E10" />
        <path d="M 78 47 V 74 C 68 71, 58 70, 50 76 V 79 C 58 73, 68 74, 78 77 Z" stroke="#55555E" strokeWidth="1.1" fill="#0E0E10" />

        {/* Left page */}
        <path
          d="M 50 42 C 40 37, 28 38, 20 44 V 71 C 28 66, 40 65, 50 73 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="#0E0E10"
        />
        <path d="M 27 50 C 32 48, 38 48, 43 51" stroke="#8E8E93" strokeWidth="1" opacity="0.6" />
        <path d="M 27 55 C 32 53, 38 53, 43 56" stroke="#8E8E93" strokeWidth="1" opacity="0.6" />
        <path d="M 27 60 C 32 58, 38 58, 41 61" stroke="#8E8E93" strokeWidth="1" opacity="0.6" />

        {/* Right page */}
        <path
          d="M 50 42 C 60 37, 72 38, 80 44 V 71 C 72 66, 60 65, 50 73 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="#0E0E10"
        />
        <path d="M 57 51 C 62 48, 68 48, 73 50" stroke="#8E8E93" strokeWidth="1" opacity="0.6" />
        <path d="M 57 56 C 62 53, 68 53, 73 55" stroke="#8E8E93" strokeWidth="1" opacity="0.6" />
        <path d="M 64 61 L 66 61 M 65 60 L 65 62" stroke="#8E8E93" strokeWidth="1" />

        {/* Waving bookmark ribbon */}
        <g className="animate-bookmark origin-top">
          <path
            d="M 50 73 C 48 78, 52 82, 50 87 L 53 85 L 56 87 C 54 82, 52 78, 50 73"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="#0E0E10"
          />
        </g>
      </g>

      {/* Sparkle */}
      <g className="animate-sparkle">
        <path d="M 76 34 L 78 34 M 77 33 L 77 35" stroke="#8E8E93" strokeWidth="1" />
      </g>
    </svg>
  );
}

/**
 * The Little Ledger Destination:
 * Hand-drawn cozy pocket ledger notebook with tucked receipt slip, stitched spine,
 * and a small resting pencil.
 */
export function DoodleLedgerNotebook({ className = "w-20 h-20" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} overflow-visible select-none`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Desk surface */}
      <path d="M 18 84 C 36 82, 64 82, 82 84" stroke="#3E3E48" strokeWidth="1.3" />

      {/* Ledger Notebook Group */}
      <g className="transition-transform duration-300 group-hover:-translate-y-0.5">
        {/* Book shadow / bottom page edges */}
        <path
          d="M 28 44 L 68 38 L 74 76 L 34 82 Z"
          stroke="#33333C"
          strokeWidth="1.2"
          fill="#0E0E10"
        />

        {/* Notebook Cover (slightly tilted cozy journal) */}
        <path
          d="M 26 40 L 66 34 L 72 74 L 32 80 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="#141418"
        />

        {/* Spine stitched binding */}
        <path d="M 26 40 L 32 80" stroke="currentColor" strokeWidth="2.2" />
        <path d="M 27 46 L 31 47 M 28 54 L 32 55 M 29 62 L 33 63 M 30 70 L 34 71" stroke="#8E8E93" strokeWidth="1.2" />

        {/* Inner ruled lines on cover / label border */}
        <rect
          x="38"
          y="46"
          width="24"
          height="16"
          rx="1"
          stroke="#55555E"
          strokeWidth="1"
          strokeDasharray="2 2"
          transform="rotate(3 50 54)"
        />
        <path d="M 42 52 L 56 50 M 43 56 L 53 54" stroke="#77777D" strokeWidth="0.9" opacity="0.7" />

        {/* Tucked paper receipt slip peeking out from the top */}
        <path
          d="M 50 36 L 52 24 L 62 26 L 60 35"
          stroke="#EAE6DF"
          strokeWidth="1.3"
          fill="#1C1C22"
        />
        <path d="M 53 27 L 59 28 M 53 30 L 58 31" stroke="#8E8E93" strokeWidth="0.8" />
        {/* Serrated receipt top edge */}
        <path d="M 52 24 L 54 22 L 56 24 L 58 22 L 60 24 L 62 26" stroke="#EAE6DF" strokeWidth="1" />

        {/* Pencil resting across notebook bottom */}
        <g className="transition-transform duration-300 group-hover:rotate-1 origin-center">
          <path
            d="M 56 78 L 78 56 L 82 60 L 60 82 Z"
            stroke="currentColor"
            strokeWidth="1.3"
            fill="#0E0E10"
          />
          {/* Pencil tip */}
          <path d="M 56 78 L 51 83 L 60 82 Z" stroke="currentColor" strokeWidth="1.2" fill="#EAE6DF" />
          <path d="M 51 83 L 53 81" stroke="#0E0E10" strokeWidth="1.5" />
          {/* Pencil eraser band */}
          <path d="M 77 57 L 81 61" stroke="#77777D" strokeWidth="1" />
        </g>
      </g>

      {/* Tiny subtle coin sparkle */}
      <g className="animate-sparkle">
        <circle cx="75" cy="38" r="3" stroke="#8E8E93" strokeWidth="1" strokeDasharray="1.5 1.5" />
        <path d="M 75 36 V 40 M 73 38 H 77" stroke="#77777D" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

/**
 * Hand-drawn curved connection arrow / trail.
 */
export function DoodleTrailArrow({
  direction = "down-right",
  className = "w-6 h-6 text-[#44444C]",
}: {
  direction?: "down-right" | "down-left" | "down" | "right";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={`${className} overflow-visible select-none inline-block`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "down-right" && (
        <>
          <path d="M 6 8 C 14 10, 22 16, 24 24" strokeWidth="1.4" strokeDasharray="3 3" />
          <path d="M 18 22 L 24 24 L 25 18" strokeWidth="1.4" />
        </>
      )}
      {direction === "down-left" && (
        <>
          <path d="M 26 8 C 18 10, 10 16, 8 24" strokeWidth="1.4" strokeDasharray="3 3" />
          <path d="M 14 22 L 8 24 L 7 18" strokeWidth="1.4" />
        </>
      )}
      {direction === "down" && (
        <>
          <path d="M 16 6 C 16.5 13, 15.5 19, 16 26" strokeWidth="1.4" strokeDasharray="3 3" />
          <path d="M 12 21 L 16 26 L 20 21" strokeWidth="1.4" />
        </>
      )}
      {direction === "right" && (
        <>
          <path d="M 6 16 C 13 15.5, 19 16.5, 26 16" strokeWidth="1.4" strokeDasharray="3 3" />
          <path d="M 21 12 L 26 16 L 21 20" strokeWidth="1.4" />
        </>
      )}
    </svg>
  );
}
