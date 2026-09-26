"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function StorybookPortal() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Link
      href="/storybook"
      className="group relative flex flex-col items-center justify-end p-4 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#BA533C] focus-visible:ring-offset-4 focus-visible:ring-offset-[#13151A]"
      aria-label="The Storybook: Chronicle your projects, achievements, and career learning journey"
    >
      {/* Hand-drawn doodle accent: Tiny chronicle annotation */}
      <span
        aria-hidden="true"
        className="absolute top-1 right-2 text-xs font-doodle text-[#BA533C]/70 group-hover:text-[#E87A64] transition-colors select-none"
      >
        ~ chronicle ~
      </span>

      {/* Interactive Illustrated Antique Tome on Wooden Stand */}
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
          {/* Wooden Bookstand / Lectern Base */}
          <path d="M52 152 L48 168 H122 L118 152 Z" fill="#3B2516" stroke="#1F120A" strokeWidth="1.5" />
          <rect x="42" y="148" width="86" height="6" rx="2" fill="#4D321F" stroke="#1F120A" strokeWidth="1.5" />

          {/* Wooden Lectern Slanted Board */}
          <polygon
            points="34,136 136,136 142,148 28,148"
            fill="#5E3C25"
            stroke="#1F120A"
            strokeWidth="1.5"
          />

          {/* The Antique Illustrated Storybook (Thick, Resting on Lectern) */}
          <g className="transition-transform duration-300 group-hover:translate-y-[-2px]">
            {/* Book Spine (Left) */}
            <path
              d="M38 68 C38 64 42 62 46 63 L82 72 V132 L46 123 C42 122 38 124 38 127 Z"
              fill="#662518"
              stroke="#3D140C"
              strokeWidth="2"
            />
            {/* Spine Decorative Ribs */}
            <path d="M40 80 L46 81.5" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <path d="M40 96 L46 97.5" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
            <path d="M40 112 L46 113.5" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />

            {/* Left Page Block (Thick deckled paper stack) */}
            <path
              d="M48 64 L84 72 V130 L48 122 Z"
              fill="#D2C5B0"
              stroke="#8A775F"
              strokeWidth="1"
            />
            {/* Left Top Exposed Page */}
            <path
              d="M50 66 C62 67 74 70 84 73 V129 C74 126 62 123 50 122 Z"
              fill="#EFEAE0"
              stroke="#B3A28A"
              strokeWidth="1"
            />
            {/* Text lines on left page */}
            <line x1="56" y1="78" x2="78" y2="83" stroke="#8C7A64" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="56" y1="88" x2="78" y2="93" stroke="#8C7A64" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="56" y1="98" x2="78" y2="103" stroke="#8C7A64" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="56" y1="108" x2="72" y2="112" stroke="#8C7A64" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

            {/* Right Page Block (Thick deckled paper stack) */}
            <path
              d="M84 72 L122 64 C126 63 130 65 130 69 V128 C130 125 126 123 122 122 L84 130 Z"
              fill="#D2C5B0"
              stroke="#8A775F"
              strokeWidth="1"
            />
            {/* Right Top Exposed Page */}
            <path
              d="M84 73 C94 70 106 67 118 66 V122 C106 123 94 126 84 129 Z"
              fill="#F7F3EB"
              stroke="#B3A28A"
              strokeWidth="1"
            />

            {/* Right Page Illustration Vignette: A Tiny Compass / Milestone Star */}
            <circle cx="101" cy="88" r="9" fill="#EAE2D5" stroke="#D4AF37" strokeWidth="1" />
            <path d="M101 80 L103 88 L101 96 L99 88 Z" fill="#C2410C" />
            <path d="M93 88 L101 90 L109 88 L101 86 Z" fill="#D4AF37" />

            <line x1="90" y1="104" x2="114" y2="101" stroke="#8C7A64" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <line x1="90" y1="112" x2="110" y2="109" stroke="#8C7A64" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

            {/* Book Spine Center Crease */}
            <line x1="84" y1="72" x2="84" y2="132" stroke="#4A180E" strokeWidth="2" />

            {/* Golden Silk Bookmark Ribbon draping over bottom */}
            <g className={shouldReduceMotion ? "" : "animate-sway"}>
              <path
                d="M84 72 C83 90 85 110 84 135 C83 145 92 148 90 158 L84 153 L78 158 C80 148 83 145 84 135"
                fill="#E5B458"
                stroke="#9E731C"
                strokeWidth="1"
              />
            </g>
          </g>
        </svg>
      </motion.div>

      {/* Atmospheric Dark Sign / Label */}
      <div className="mt-3 text-center transition-transform duration-200 group-hover:translate-y-[-2px]">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#1F232B] border border-[#2F3543] group-hover:border-[#BA533C]/50 group-hover:bg-[#2B2120] transition-colors shadow-xs">
          <span className="text-base" role="img" aria-hidden="true">
            📖
          </span>
          <span className="font-serif font-medium text-sm text-[#EAE6DF] group-hover:text-[#F09F8F]">
            The Storybook
          </span>
        </div>
        <p className="text-xs text-[#9D978C] mt-1 font-sans">
          Journey &amp; Achievements
        </p>
      </div>
    </Link>
  );
}
