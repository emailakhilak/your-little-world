"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function WindowPortal() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      href="/window"
      className="group relative flex flex-col items-center justify-end p-4 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6275A4] focus-visible:ring-offset-4 focus-visible:ring-offset-[#13151A]"
      aria-label="The Faraway Window: Discover curated news, space explorations, and stories beyond"
    >
      {/* Hand-drawn doodle accent: Tiny looking out annotation */}
      <span
        aria-hidden="true"
        className="absolute top-1 right-2 text-xs font-doodle text-[#6275A4]/70 group-hover:text-[#8FA5D9] transition-colors select-none"
      >
        ✧ look out ~
      </span>

      {/* Interactive Illustrated Arched Window & Brass Telescope */}
      <motion.div
        className="relative w-48 h-52 sm:w-52 sm:h-56 flex items-end justify-center"
        whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.015 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        {/* Soft Dark Shadow */}
        <div className="absolute -bottom-2 w-36 h-5 bg-[#0A0C0F]/60 rounded-full blur-[4px] group-hover:w-40 group-hover:bg-[#0A0C0F]/80 transition-all duration-300" />

        <svg
          viewBox="0 0 170 180"
          className="w-full h-full drop-shadow-md select-none group-hover:brightness-108 transition-[filter] duration-300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Arched Window Sill & Exterior Shadow */}
          <path
            d="M25 158 H145 V166 C145 168 143 170 140 170 H30 C27 170 25 168 25 166 V158 Z"
            fill="#302319"
          />
          <rect x="20" y="152" width="130" height="8" rx="2" fill="#473426" stroke="#261A11" strokeWidth="1.5" />

          {/* Arched Window Outer Frame */}
          <path
            d="M32 152 V75 C32 45 55 24 85 24 C115 24 138 45 138 75 V152 Z"
            fill="#3B2A1E"
            stroke="#261A11"
            strokeWidth="2.5"
          />

          {/* Window Glass / Deep Night Sky Horizon */}
          <path
            d="M39 152 V75 C39 49 59 31 85 31 C111 31 131 49 131 75 V152 Z"
            fill="url(#nightSkyGradient)"
          />

          {/* Gradient Definition for Deep Night Sky */}
          <defs>
            <linearGradient id="nightSkyGradient" x1="85" y1="31" x2="85" y2="152" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0B0F1A" />
              <stop offset="50%" stopColor="#151D2E" />
              <stop offset="85%" stopColor="#25324E" />
              <stop offset="100%" stopColor="#3C4B6C" />
            </linearGradient>
          </defs>

          {/* Distant Stars in the Window Sky */}
          <g className={shouldReduceMotion ? "" : "animate-twinkle"}>
            <circle cx="60" cy="50" r="1.5" fill="#FFE8A3" />
            <circle cx="106" cy="46" r="1.8" fill="#FFFBE6" />
            <circle cx="78" cy="40" r="1" fill="#FFE8A3" />
            <circle cx="120" cy="62" r="1.2" fill="#FFF5CC" />
            {/* Doodle Cross Star */}
            <path d="M52 64 L54 64 M53 63 L53 65" stroke="#E5B458" strokeWidth="0.8" />
          </g>

          {/* Drifting Soft Cloud */}
          <g className={shouldReduceMotion ? "" : "animate-float"} opacity="0.45">
            <path
              d="M48 88 C48 84 52 80 56 80 C58 76 64 75 68 78 C71 76 77 77 78 81 C82 81 85 84 85 88 Z"
              fill="#56688A"
            />
          </g>

          {/* Window Panes Grid (Wooden Mullions) */}
          <line x1="85" y1="31" x2="85" y2="152" stroke="#261A11" strokeWidth="2.5" />
          <line x1="39" y1="88" x2="131" y2="88" stroke="#261A11" strokeWidth="2" />
          <line x1="39" y1="122" x2="131" y2="122" stroke="#261A11" strokeWidth="2" />

          {/* Draped Curtain (Left Side) */}
          <g className={shouldReduceMotion ? "" : "animate-breeze"}>
            <path
              d="M32 40 C38 48 42 70 38 100 C35 120 44 140 40 152 H32 V40 Z"
              fill="#2A2F3D"
              stroke="#1C202B"
              strokeWidth="1.2"
              opacity="0.95"
            />
            {/* Curtain Tie-back */}
            <path d="M30 96 C36 97 40 97 42 95" stroke="#8A6E46" strokeWidth="2" />
          </g>

          {/* Brass Telescope on Wooden Tripod Mount */}
          <g className="transition-transform duration-300 group-hover:rotate-[-1.5deg]">
            {/* Tripod legs */}
            <line x1="102" y1="152" x2="94" y2="114" stroke="#261A11" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="106" y1="152" x2="116" y2="114" stroke="#261A11" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="105" y1="152" x2="105" y2="112" stroke="#38271A" strokeWidth="2" />

            {/* Mount pivot */}
            <circle cx="105" cy="112" r="3.5" fill="#C4962C" stroke="#7A560D" strokeWidth="1" />

            {/* Main Brass Barrel (Angled toward the sky) */}
            <path
              d="M72 90 L128 120 L124 126 L68 96 Z"
              fill="#D4A73B"
              stroke="#684A0E"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Eyepiece */}
            <rect
              x="126"
              y="120"
              width="9"
              height="6"
              rx="1"
              transform="rotate(28 126 120)"
              fill="#B88A22"
              stroke="#684A0E"
              strokeWidth="1"
            />
            {/* Objective Lens Hood */}
            <rect
              x="64"
              y="88"
              width="10"
              height="8"
              rx="1.5"
              transform="rotate(28 64 88)"
              fill="#E5BD56"
              stroke="#684A0E"
              strokeWidth="1.2"
            />
            {/* Glass reflection highlight on barrel */}
            <path d="M76 92 L120 117" stroke="#FFF0C4" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
          </g>
        </svg>
      </motion.div>

      {/* Atmospheric Dark Sign / Label */}
      <div className="mt-3 text-center transition-transform duration-200 group-hover:translate-y-[-2px]">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1F232B] border border-[#2F3543] group-hover:border-[#6275A4]/50 group-hover:bg-[#202634] transition-colors shadow-xs">
          <span className="text-base" role="img" aria-hidden="true">
            🪟
          </span>
          <span className="font-serif font-medium text-sm text-[#EAE6DF] group-hover:text-[#A6B8E2]">
            The Faraway Window
          </span>
        </div>
        <p className="text-xs text-[#9D978C] mt-1 font-sans">
          News &amp; Distant Discoveries
        </p>
      </div>
    </Link>
  );
}
