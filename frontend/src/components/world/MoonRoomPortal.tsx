"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function MoonRoomPortal() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      href="/moon"
      className="group relative flex flex-col items-center justify-end p-4 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B9BC2] focus-visible:ring-offset-4 focus-visible:ring-offset-[#13151A]"
      aria-label="The Moon Room: Your private personal diary and quiet reflections"
    >
      {/* Hand-drawn doodle accent: Tiny quiet night annotation */}
      <span
        aria-hidden="true"
        className="absolute top-1 right-2 text-xs font-doodle text-[#8B9BC2]/70 group-hover:text-[#B4C3E8] transition-colors select-none"
      >
        · quiet thoughts ·
      </span>

      {/* Interactive Illustrated Moonlit Alcove, Lantern & Journal */}
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
          {/* Moonlit Alcove Arch Frame */}
          <path
            d="M30 156 V80 C30 50 54 28 85 28 C116 28 140 50 140 80 V156 Z"
            fill="#161B29"
            stroke="#0B0D14"
            strokeWidth="2.5"
          />

          {/* Deep Midnight Blue Alcove Interior */}
          <path
            d="M38 156 V80 C38 54 58 36 85 36 C112 36 132 54 132 80 V156 Z"
            fill="url(#moonAlcoveGrad)"
          />

          <defs>
            <linearGradient id="moonAlcoveGrad" x1="85" y1="36" x2="85" y2="156" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0A0C13" />
              <stop offset="60%" stopColor="#101524" />
              <stop offset="100%" stopColor="#1A2238" />
            </linearGradient>
          </defs>

          {/* Glowing Crescent Moon in Alcove Sky */}
          <g className={shouldReduceMotion ? "" : "animate-twinkle"}>
            <circle cx="94" cy="61" r="14" fill="#FFEAA8" opacity="0.18" filter="blur(4px)" />
            <path
              d="M98 48 C91 48 85 54 85 61 C85 68 91 74 98 74 C93 72 90 67 90 61 C90 55 93 50 98 48 Z"
              fill="#FFF2B8"
            />
          </g>

          {/* Distant Delicate Stars */}
          <circle cx="62" cy="58" r="1.2" fill="#E4EAF8" opacity="0.8" />
          <circle cx="114" cy="54" r="1" fill="#E4EAF8" opacity="0.7" />
          <circle cx="70" cy="74" r="0.8" fill="#E4EAF8" opacity="0.6" />

          {/* Stone Ledge */}
          <rect x="24" y="152" width="122" height="9" rx="2" fill="#252D3F" stroke="#121622" strokeWidth="1.5" />

          {/* Glowing Brass Lantern */}
          <g className="transition-transform duration-300 group-hover:scale-[1.03]">
            {/* Lantern Loop / Handle */}
            <circle cx="62" cy="89" r="6" stroke="#C49B3C" strokeWidth="1.5" fill="none" />

            {/* Lantern Cap */}
            <path d="M52 98 L62 93 L72 98 Z" fill="#8C661D" stroke="#4F380A" strokeWidth="1" />

            {/* Glass Chamber */}
            <rect x="54" y="98" width="16" height="25" rx="2" fill="#FFEFA8" opacity="0.3" stroke="#4F380A" strokeWidth="1" />
            <line x1="62" y1="98" x2="62" y2="123" stroke="#4F380A" strokeWidth="0.8" opacity="0.6" />

            {/* Lantern Base */}
            <rect x="52" y="123" width="20" height="5" rx="1.5" fill="#8C661D" stroke="#4F380A" strokeWidth="1" />

            {/* Pulsing Warm Flame Inside */}
            <g className={shouldReduceMotion ? "" : "animate-pulse-lamp"}>
              <circle cx="62" cy="111" r="16" fill="#FAD058" opacity="0.3" filter="blur(6px)" />
              <ellipse cx="62" cy="112" rx="3.5" ry="5.5" fill="#FFA726" />
              <ellipse cx="62" cy="113" rx="2" ry="3.5" fill="#FFFBE6" />
            </g>
          </g>

          {/* Midnight Diary / Journal resting on ledge */}
          <g className="transition-transform duration-300 group-hover:translate-x-0.5">
            {/* Journal Back Cover */}
            <rect
              x="92"
              y="114"
              width="42"
              height="38"
              rx="3"
              transform="rotate(6 92 114)"
              fill="#182236"
              stroke="#0A0E17"
              strokeWidth="1.5"
            />
            {/* Journal Pages (Warm Ivory Paper Edge) */}
            <rect
              x="90"
              y="116"
              width="40"
              height="34"
              rx="1.5"
              transform="rotate(6 90 116)"
              fill="#E5DDD0"
            />
            {/* Journal Leather Front Cover */}
            <rect
              x="88"
              y="116"
              width="40"
              height="36"
              rx="3"
              transform="rotate(6 88 116)"
              fill="#222F4A"
              stroke="#0A0E17"
              strokeWidth="1.5"
            />
            {/* Embossed Moon Gold Seal on Cover */}
            <circle cx="106" cy="136" r="5" fill="#D4AF37" opacity="0.9" />
            <path d="M106 133 C104 133 102 135 102 137 C102 139 104 140 106 140 C104.5 139 104 138 104 137 C104 135.5 104.5 134 106 133 Z" fill="#182236" />

            {/* Silk Ribbon Bookmark hanging from diary */}
            <path
              d="M108 152 C108 156 112 158 110 164"
              stroke="#BA3C2E"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </motion.div>

      {/* Atmospheric Dark Sign / Label */}
      <div className="mt-3 text-center transition-transform duration-200 group-hover:translate-y-[-2px]">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1F232B] border border-[#2F3543] group-hover:border-[#6275A4]/50 group-hover:bg-[#1E2536] transition-colors shadow-xs">
          <span className="text-base" role="img" aria-hidden="true">
            🌙
          </span>
          <span className="font-serif font-medium text-sm text-[#EAE6DF] group-hover:text-[#B6C6ED]">
            The Moon Room
          </span>
        </div>
        <p className="text-xs text-[#9D978C] mt-1 font-sans">
          Private Diary &amp; Reflections
        </p>
      </div>
    </Link>
  );
}
