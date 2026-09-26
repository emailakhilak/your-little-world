"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function GardenPortal() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      href="/garden"
      className="group relative flex flex-col items-center justify-end p-4 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86A868] focus-visible:ring-offset-4 focus-visible:ring-offset-[#13151A]"
      aria-label="Garden of Tomorrow: View your goals, recurring habits, and things waiting to grow"
    >
      {/* Hand-drawn doodle accent: Tiny wandering sprout doodle */}
      <span
        aria-hidden="true"
        className="absolute top-1 right-2 text-xs font-doodle text-[#86A868]/60 group-hover:text-[#A4C982] transition-colors select-none"
      >
        ✦ grow
      </span>

      {/* Interactive Illustrated Plant & Ceramic Pot */}
      <motion.div
        className="relative w-44 h-48 sm:w-48 sm:h-52 flex items-end justify-center"
        whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.015 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        {/* Soft Dark Shadow */}
        <div className="absolute -bottom-2 w-32 h-5 bg-[#0A0C0F]/60 rounded-full blur-[4px] group-hover:w-36 group-hover:bg-[#0A0C0F]/80 transition-all duration-300" />

        <svg
          viewBox="0 0 160 170"
          className="w-full h-full drop-shadow-md select-none group-hover:brightness-108 transition-[filter] duration-300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ceramic Saucer */}
          <ellipse cx="80" cy="154" rx="42" ry="7" fill="#6B3C23" />
          <ellipse cx="80" cy="152" rx="40" ry="6" fill="#8C4E2D" stroke="#542B15" strokeWidth="1.5" />

          {/* Ceramic Pot Body */}
          <path
            d="M48 108 L54 150 C55 152 58 153 62 153 H98 C102 153 105 152 106 150 L112 108 Z"
            fill="#B5673E"
            stroke="#542B15"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Pot Highlight & Shading */}
          <path
            d="M52 110 L57 148 C57.5 149 59 150 62 150 H75 L70 110 Z"
            fill="#CF7D52"
            opacity="0.65"
          />
          <path
            d="M90 110 L94 150 H98 C101 150 102 149 103 148 L108 110 Z"
            fill="#7A3918"
            opacity="0.6"
          />

          {/* Pot Rim */}
          <rect
            x="44"
            y="100"
            width="72"
            height="10"
            rx="4"
            fill="#9E542E"
            stroke="#542B15"
            strokeWidth="2"
          />

          {/* Rich Dark Soil */}
          <ellipse cx="80" cy="103" rx="30" ry="4" fill="#2E1F16" />

          {/* Wooden Seedling Marker Tag */}
          <g className="transition-transform duration-300 group-hover:rotate-1">
            <path d="M62 102 L64 74 L74 74 L72 102 Z" fill="#998363" stroke="#5C4B33" strokeWidth="1.2" />
            <rect x="61" y="62" width="18" height="13" rx="2" fill="#B8A484" stroke="#5C4B33" strokeWidth="1.2" />
            <path d="M70 66 C70 66 67 69 70 71 C73 69 70 66 70 66 Z" fill="#6B8E23" />
          </g>

          {/* The Living Plant (Sprout & Leaves) */}
          <g className={shouldReduceMotion ? "" : "animate-sway"}>
            {/* Main curved stem */}
            <path
              d="M80 102 C80 85 84 65 78 42"
              stroke="#6E9433"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Left Lower Leaf */}
            <path
              d="M79 78 C65 76 50 82 46 90 C56 94 72 88 79 80"
              fill="#7A9E3C"
              stroke="#395018"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M78 79 C68 82 56 87 50 89" stroke="#96BA54" strokeWidth="1" strokeLinecap="round" opacity="0.8" />

            {/* Right Middle Leaf */}
            <path
              d="M79 66 C92 62 108 67 114 76 C103 81 87 76 79 68"
              fill="#8BB145"
              stroke="#395018"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M80 67 C91 70 102 74 109 75" stroke="#A7CF5D" strokeWidth="1" strokeLinecap="round" opacity="0.8" />

            {/* Left Upper Leaf */}
            <path
              d="M78 52 C64 45 52 49 48 56 C58 61 71 58 78 53"
              fill="#98BD52"
              stroke="#395018"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Budding Top Shoots */}
            <path
              d="M78 42 C74 32 76 22 80 18 C83 23 83 34 78 42 Z"
              fill="#AFCE6B"
              stroke="#395018"
              strokeWidth="1.5"
            />
            <path
              d="M78 42 C82 35 90 28 95 27 C94 33 88 40 78 42 Z"
              fill="#94B951"
              stroke="#395018"
              strokeWidth="1.5"
            />
          </g>

          {/* Subtle Doodle Sparkle over the sprout */}
          <g className={shouldReduceMotion ? "" : "animate-sparkle"}>
            <path
              d="M112 36 L113.5 41 L118.5 42.5 L113.5 44 L112 49 L110.5 44 L105.5 42.5 L110.5 41 Z"
              fill="#E5B458"
              opacity="0.75"
            />
          </g>
        </svg>
      </motion.div>

      {/* Atmospheric Dark Sign / Label with subtle doodle underline */}
      <div className="mt-3 text-center transition-transform duration-200 group-hover:translate-y-[-2px]">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1F232B] border border-[#2F3543] group-hover:border-[#86A868]/50 group-hover:bg-[#232B25] transition-colors shadow-xs">
          <span className="text-base" role="img" aria-hidden="true">
            🌱
          </span>
          <span className="font-serif font-medium text-sm text-[#EAE6DF] group-hover:text-[#B6D695]">
            Garden of Tomorrow
          </span>
        </div>
        <p className="text-xs text-[#9D978C] mt-1 font-sans">
          Goals &amp; Things to Grow
        </p>
      </div>
    </Link>
  );
}
