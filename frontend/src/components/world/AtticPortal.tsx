"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function AtticPortal() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      href="/attic"
      className="group relative flex flex-col items-center justify-end p-4 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B3835B] focus-visible:ring-offset-4 focus-visible:ring-offset-[#13151A]"
      aria-label="The Little Attic: Keep your notes, fleeting sparks, and questions"
    >
      {/* Hand-drawn doodle accent: Tiny sparks annotation */}
      <span
        aria-hidden="true"
        className="absolute top-1 right-2 text-xs font-doodle text-[#B3835B]/70 group-hover:text-[#DEAB7E] transition-colors select-none"
      >
        ~ sparks &amp; ink ~
      </span>

      {/* Interactive Illustrated Wooden Desk & Chest */}
      <motion.div
        className="relative w-48 h-52 sm:w-52 sm:h-56 flex items-end justify-center"
        whileHover={shouldReduceMotion ? {} : { y: -3, scale: 1.015 }}
        whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        {/* Soft Dark Shadow */}
        <div className="absolute -bottom-2 w-38 h-5 bg-[#0A0C0F]/60 rounded-full blur-[4px] group-hover:w-42 group-hover:bg-[#0A0C0F]/80 transition-all duration-300" />

        <svg
          viewBox="0 0 170 180"
          className="w-full h-full drop-shadow-md select-none group-hover:brightness-108 transition-[filter] duration-300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Desk Legs / Stand */}
          <path d="M42 145 L38 165 H46 L49 145 Z" fill="#2E1C11" />
          <path d="M128 145 L132 165 H124 L121 145 Z" fill="#2E1C11" />

          {/* Wooden Chest / Desk Body */}
          <rect
            x="32"
            y="94"
            width="106"
            height="54"
            rx="4"
            fill="#563820"
            stroke="#2B1A0E"
            strokeWidth="2"
          />

          {/* Top Desk Lip */}
          <rect
            x="26"
            y="88"
            width="118"
            height="9"
            rx="2.5"
            fill="#6B4628"
            stroke="#2B1A0E"
            strokeWidth="2"
          />

          {/* Top Drawer (Closed) */}
          <rect
            x="38"
            y="100"
            width="94"
            height="18"
            rx="2"
            fill="#472E1A"
            stroke="#2B1A0E"
            strokeWidth="1.5"
          />
          {/* Top Drawer Brass Pull Ring */}
          <circle cx="85" cy="109" r="3.5" fill="#D4AF37" stroke="#684A0E" strokeWidth="1" />

          {/* Bottom Drawer (Slightly Ajar with peeking manuscript papers) */}
          <g className="transition-transform duration-300 group-hover:translate-y-1">
            <rect
              x="38"
              y="122"
              width="94"
              height="20"
              rx="2"
              fill="#3D2716"
              stroke="#2B1A0E"
              strokeWidth="1.5"
            />
            {/* Bottom Drawer Brass Pull Ring */}
            <circle cx="85" cy="132" r="3.5" fill="#D4AF37" stroke="#684A0E" strokeWidth="1" />

            {/* Peeking Parchment Sheets from inside drawer */}
            <path
              d="M48 122 L52 112 L70 114 L66 122 Z"
              fill="#E8DEC9"
              stroke="#8F7E64"
              strokeWidth="1"
            />
            <path
              d="M62 122 L65 110 L84 112 L80 122 Z"
              fill="#F4EFE6"
              stroke="#8F7E64"
              strokeWidth="1"
            />
          </g>

          {/* Desk Surface Items: Candle & Inkpot */}
          {/* Brass Candleholder */}
          <ellipse cx="50" cy="87" rx="10" ry="3.5" fill="#C99E3D" stroke="#684A0E" strokeWidth="1.2" />
          <rect x="48" y="65" width="4" height="22" rx="1" fill="#E8DEC8" stroke="#7A684C" strokeWidth="1" />

          {/* Candle Flame (Warm Pulse Animation & Luminous Glow in the dark) */}
          <g className={shouldReduceMotion ? "" : "animate-pulse-lamp"}>
            <circle cx="50" cy="60" r="16" fill="#FCE182" opacity="0.22" filter="blur(6px)" />
            <ellipse cx="50" cy="60" rx="9" ry="9" fill="#FCE182" opacity="0.45" filter="blur(2px)" />
            <path
              d="M50 54 C48 57 47 61 48 64 C49 66 51 66 52 64 C53 61 52 57 50 54 Z"
              fill="#FFB03A"
            />
            <path
              d="M50 58 C49 60 48.5 62 49 63.5 C49.5 64.5 50.5 64.5 51 63.5 C51.5 62 51 60 50 58 Z"
              fill="#FFFBE8"
            />
          </g>

          {/* Glass Inkpot with Dark Navy Ink */}
          <rect x="110" y="78" width="13" height="11" rx="2.5" fill="#1C2430" stroke="#0E131A" strokeWidth="1.2" />
          <rect x="113" y="75" width="7" height="3.5" rx="1" fill="#523924" />

          {/* Feather Quill resting in inkpot */}
          <path
            d="M116 77 C118 60 128 44 135 34 C132 45 125 58 120 74"
            stroke="#DCD6C8"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M120 74 L117 78" stroke="#1C2430" strokeWidth="1.5" />
          {/* Feather barbs */}
          <path d="M126 48 C132 44 136 45 138 46" stroke="#B8B0A0" strokeWidth="1.2" />
          <path d="M123 58 C128 54 132 55 134 57" stroke="#B8B0A0" strokeWidth="1.2" />
        </svg>
      </motion.div>

      {/* Atmospheric Dark Sign / Label */}
      <div className="mt-3 text-center transition-transform duration-200 group-hover:translate-y-[-2px]">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1F232B] border border-[#2F3543] group-hover:border-[#B3835B]/50 group-hover:bg-[#28221D] transition-colors shadow-xs">
          <span className="text-base" role="img" aria-hidden="true">
            🕯️
          </span>
          <span className="font-serif font-medium text-sm text-[#EAE6DF] group-hover:text-[#E8BA92]">
            The Little Attic
          </span>
        </div>
        <p className="text-xs text-[#9D978C] mt-1 font-sans">
          Notes, Ideas &amp; Sparks
        </p>
      </div>
    </Link>
  );
}
