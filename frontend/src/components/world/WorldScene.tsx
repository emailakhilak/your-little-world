"use client";

import Link from "next/link";
import { useDailySnapshot } from "@/lib/useDailySnapshot";
import {
  DoodleTitleStar,
  DoodleTitleUnderline,
  DoodleNotebookDivider,
  DoodleLivingRoomCenter,
  DoodleGardenSprout,
  DoodleAtticCandle,
  DoodleMoonCrescent,
  DoodleStorybookOpen,
  DoodleLedgerNotebook,
  DoodleTrailArrow,
} from "./LivingRoomDoodles";

export default function WorldScene() {
  const { greeting, refreshAll } = useDailySnapshot();

  return (
    <div className="relative w-full max-w-4xl mx-auto my-auto px-4 sm:px-6 py-6 sm:py-10 text-center select-text">
      {/* =========================================================================
          1. TITLE: Handwritten at the top of the personal notebook page
             ✦
             YOUR LITTLE WORLD
             ~ my little world ~
             ✦
          ========================================================================= */}
      <header className="relative flex flex-col items-center mb-10 sm:mb-14 select-none">
        {/* Top subtle hand-drawn star */}
        <div className="mb-1.5 animate-twinkle">
          <DoodleTitleStar className="w-3.5 h-3.5 text-[#8E8E93]" />
        </div>

        {/* Title */}
        <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-[#F5F5F5] font-normal tracking-wide sm:tracking-widest uppercase">
          Your Little World
        </h1>

        {/* Sketched Hand-drawn Underline */}
        <DoodleTitleUnderline className="w-40 sm:w-56 h-3 text-[#3E3E48] mt-1 mb-2" />

        {/* Quiet Subtitle */}
        <p className="font-doodle text-sm sm:text-base text-[#8E8E93] tracking-widest mt-0.5">
          ~ my little world ~
        </p>

        {/* Bottom subtle hand-drawn star */}
        <div className="mt-2 animate-twinkle">
          <DoodleTitleStar className="w-3.5 h-3.5 text-[#8E8E93]" />
        </div>
      </header>

      {/* =========================================================================
          2. COHESIVE ILLUSTRATED WORLD COMPOSITION
             No rectangular cards. No boxes.
             A single hand-drawn scene with the Living Room in the center and the
             four destinations living naturally around it.
          ========================================================================= */}

      {/* ─────────────────────────────────────────────────────────────────────────
          DESKTOP & TABLET COMPOSITION (md and above)
          Spacious illustrated layout with central hearth and 4 destinations
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="hidden md:block relative w-full max-w-3xl mx-auto my-4 min-h-[500px]">
        {/* Background Hand-Drawn Connecting Trails (Center -> 4 Destinations) */}
        <svg
          viewBox="0 0 700 500"
          className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-visible"
          fill="none"
          aria-hidden="true"
        >
          {/* Path 1: Center to Garden (Northwest) */}
          <path
            d="M 310 210 C 250 170, 200 150, 160 130"
            stroke="#33333C"
            strokeWidth="1.3"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <path d="M 230 162 C 235 158, 237 163, 236 166" stroke="#4E4E58" strokeWidth="1" />

          {/* Path 2: Center to Attic (Northeast) */}
          <path
            d="M 390 210 C 450 170, 500 150, 540 130"
            stroke="#33333C"
            strokeWidth="1.3"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <circle cx="470" cy="160" r="1" fill="#77777D" />

          {/* Path 3: Center to Moon Room (Southwest) */}
          <path
            d="M 310 290 C 250 330, 200 350, 160 370"
            stroke="#33333C"
            strokeWidth="1.3"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <path d="M 232 334 L 234 334 M 233 333 L 233 335" stroke="#4E4E58" strokeWidth="0.8" />

          {/* Path 4: Center to StoryBook (Southeast) */}
          <path
            d="M 390 290 C 450 330, 500 350, 540 370"
            stroke="#33333C"
            strokeWidth="1.3"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <circle cx="468" cy="338" r="1" fill="#77777D" />

          {/* Path 5: Center to Ledger (South) */}
          <path
            d="M 350 280 C 350 305, 350 335, 350 360"
            stroke="#33333C"
            strokeWidth="1.3"
            strokeDasharray="4 6"
            strokeLinecap="round"
          />
          <circle cx="350" cy="320" r="1" fill="#77777D" />

          {/* Delicate hand-drawn compass / orientation stars */}
          <g className="animate-twinkle">
            <circle cx="350" cy="90" r="1" fill="#77777D" />
            <circle cx="350" cy="410" r="1" fill="#77777D" />
          </g>
        </svg>

        {/* ── TOP ROW: Garden of Tomorrow & The Little Attic ── */}
        <div className="w-full flex items-start justify-between px-4">
          {/* Destination 1: Garden of Tomorrow (Top-Left) */}
          <Link
            href="/garden"
            className="group flex flex-col items-center text-center p-3 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer max-w-[210px]"
            aria-label="Garden of Tomorrow: things I'm growing"
          >
            {/* Hand-drawn Sprout Illustration */}
            <div className="relative text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-all duration-300 group-hover:-translate-y-1">
              <DoodleGardenSprout className="w-20 h-20" />
            </div>

            {/* Handwritten Destination Label */}
            <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] font-normal tracking-wide transition-colors mt-2">
              Garden of Tomorrow
            </span>
            <span className="font-doodle text-xs text-[#8E8E93] group-hover:text-[#D4D4D8] tracking-wider transition-colors mt-0.5">
              things I&apos;m growing
            </span>
          </Link>

          {/* Destination 2: The Little Attic (Top-Right) */}
          <Link
            href="/attic"
            className="group flex flex-col items-center text-center p-3 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer max-w-[210px]"
            aria-label="The Little Attic: little ideas"
          >
            {/* Hand-drawn Candle & Notes Illustration */}
            <div className="relative text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-all duration-300 group-hover:-translate-y-1">
              <DoodleAtticCandle className="w-20 h-20" />
            </div>

            {/* Handwritten Destination Label */}
            <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] font-normal tracking-wide transition-colors mt-2">
              The Little Attic
            </span>
            <span className="font-doodle text-xs text-[#8E8E93] group-hover:text-[#D4D4D8] tracking-wider transition-colors mt-0.5">
              little ideas
            </span>
          </Link>
        </div>

        {/* ── MIDDLE ROW: The Central Living Room Hearth ── */}
        <div className="w-full flex flex-col items-center justify-center my-6 select-none">
          <div className="relative flex flex-col items-center">
            {/* Central Living Room Hand-Drawn Hearth Vignette */}
            <DoodleLivingRoomCenter className="w-48 h-38" />

            {/* Living Room Label */}
            <div className="mt-1 flex flex-col items-center">
              <span className="font-serif text-sm text-[#F0F0F0] font-normal tracking-wider">
                the living room
              </span>
              <span className="font-doodle text-[11px] text-[#77777D] tracking-wider">
                ~ where your quiet days begin ~
              </span>
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW: The Moon Room, The Little Ledger, & The StoryBook ── */}
        <div className="w-full flex items-start justify-between px-2 sm:px-4">
          {/* Destination 3: The Moon Room (Bottom-Left) */}
          <Link
            href="/moon"
            className="group flex flex-col items-center text-center p-3 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer max-w-[200px]"
            aria-label="The Moon Room: quiet thoughts"
          >
            {/* Hand-drawn Moon & Stars Illustration */}
            <div className="relative text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-all duration-300 group-hover:-translate-y-1">
              <DoodleMoonCrescent className="w-20 h-20" />
            </div>

            {/* Handwritten Destination Label */}
            <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] font-normal tracking-wide transition-colors mt-2">
              The Moon Room
            </span>
            <span className="font-doodle text-xs text-[#8E8E93] group-hover:text-[#D4D4D8] tracking-wider transition-colors mt-0.5">
              quiet thoughts
            </span>
          </Link>

          {/* Destination 5: The Little Ledger (Bottom-Center) */}
          <Link
            href="/ledger"
            className="group flex flex-col items-center text-center p-3 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer max-w-[200px]"
            aria-label="The Little Ledger: little notes about my money"
          >
            {/* Hand-drawn Ledger Notebook Illustration */}
            <div className="relative text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-all duration-300 group-hover:-translate-y-1">
              <DoodleLedgerNotebook className="w-20 h-20" />
            </div>

            {/* Handwritten Destination Label */}
            <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] font-normal tracking-wide transition-colors mt-2">
              The Little Ledger
            </span>
            <span className="font-doodle text-xs text-[#8E8E93] group-hover:text-[#D4D4D8] tracking-wider transition-colors mt-0.5">
              little notes about my money
            </span>
          </Link>

          {/* Destination 4: The StoryBook (Bottom-Right) */}
          <Link
            href="/storybook"
            className="group flex flex-col items-center text-center p-3 rounded-2xl transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer max-w-[200px]"
            aria-label="The StoryBook: things I've lived & made"
          >
            {/* Hand-drawn Open Book Illustration */}
            <div className="relative text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-all duration-300 group-hover:-translate-y-1">
              <DoodleStorybookOpen className="w-20 h-20" />
            </div>

            {/* Handwritten Destination Label */}
            <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] font-normal tracking-wide transition-colors mt-2">
              The StoryBook
            </span>
            <span className="font-doodle text-xs text-[#8E8E93] group-hover:text-[#D4D4D8] tracking-wider transition-colors mt-0.5">
              things I&apos;ve lived &amp; made
            </span>
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          MOBILE & SMALL TABLET COMPOSITION (< md)
          A gentle, natural vertical illustrated wandering path.
          Pure illustrations with hand-drawn trails — NOT stacked cards!
          ───────────────────────────────────────────────────────────────────────── */}
      <div className="md:hidden w-full max-w-sm mx-auto flex flex-col items-center gap-6 my-2">
        {/* 1. Garden of Tomorrow */}
        <Link
          href="/garden"
          className="group flex flex-col items-center text-center p-2 rounded-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer"
          aria-label="Garden of Tomorrow: things I'm growing"
        >
          <div className="text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-colors">
            <DoodleGardenSprout className="w-20 h-20" />
          </div>
          <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] mt-1.5">
            Garden of Tomorrow
          </span>
          <span className="font-doodle text-xs text-[#8E8E93]">
            things I&apos;m growing
          </span>
        </Link>

        {/* Trail Down */}
        <div aria-hidden="true" className="select-none text-[#33333C]">
          <DoodleTrailArrow direction="down" className="w-5 h-5 text-[#44444C]" />
        </div>

        {/* 2. The Little Attic */}
        <Link
          href="/attic"
          className="group flex flex-col items-center text-center p-2 rounded-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer"
          aria-label="The Little Attic: little ideas"
        >
          <div className="text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-colors">
            <DoodleAtticCandle className="w-20 h-20" />
          </div>
          <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] mt-1.5">
            The Little Attic
          </span>
          <span className="font-doodle text-xs text-[#8E8E93]">
            little ideas
          </span>
        </Link>

        {/* Trail to Center */}
        <div aria-hidden="true" className="select-none text-[#33333C]">
          <DoodleTrailArrow direction="down" className="w-5 h-5 text-[#44444C]" />
        </div>

        {/* 3. Central Living Room */}
        <div className="flex flex-col items-center text-center py-2 select-none">
          <DoodleLivingRoomCenter className="w-44 h-36" />
          <span className="font-serif text-sm text-[#F0F0F0] mt-1">
            the living room
          </span>
          <span className="font-doodle text-[11px] text-[#77777D]">
            ~ center of your world ~
          </span>
        </div>

        {/* Trail Down */}
        <div aria-hidden="true" className="select-none text-[#33333C]">
          <DoodleTrailArrow direction="down" className="w-5 h-5 text-[#44444C]" />
        </div>

        {/* 4. The Moon Room */}
        <Link
          href="/moon"
          className="group flex flex-col items-center text-center p-2 rounded-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer"
          aria-label="The Moon Room: quiet thoughts"
        >
          <div className="text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-colors">
            <DoodleMoonCrescent className="w-20 h-20" />
          </div>
          <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] mt-1.5">
            The Moon Room
          </span>
          <span className="font-doodle text-xs text-[#8E8E93]">
            quiet thoughts
          </span>
        </Link>

        {/* Trail Down */}
        <div aria-hidden="true" className="select-none text-[#33333C]">
          <DoodleTrailArrow direction="down" className="w-5 h-5 text-[#44444C]" />
        </div>

        {/* 5. The StoryBook */}
        <Link
          href="/storybook"
          className="group flex flex-col items-center text-center p-2 rounded-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer"
          aria-label="The StoryBook: things I've lived & made"
        >
          <div className="text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-colors">
            <DoodleStorybookOpen className="w-20 h-20" />
          </div>
          <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] mt-1.5">
            The StoryBook
          </span>
          <span className="font-doodle text-xs text-[#8E8E93]">
            things I&apos;ve lived &amp; made
          </span>
        </Link>

        {/* Trail Down */}
        <div aria-hidden="true" className="select-none text-[#33333C]">
          <DoodleTrailArrow direction="down" className="w-5 h-5 text-[#44444C]" />
        </div>

        {/* 6. The Little Ledger */}
        <Link
          href="/ledger"
          className="group flex flex-col items-center text-center p-2 rounded-xl focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] cursor-pointer"
          aria-label="The Little Ledger: little notes about my money"
        >
          <div className="text-[#EAE6DF] group-hover:text-[#FFFFFF] transition-colors">
            <DoodleLedgerNotebook className="w-20 h-20" />
          </div>
          <span className="font-serif text-base text-[#EAE6DF] group-hover:text-[#FFFFFF] mt-1.5">
            The Little Ledger
          </span>
          <span className="font-doodle text-xs text-[#8E8E93]">
            little notes about my money
          </span>
        </Link>
      </div>

      {/* =========================================================================
          3. SKETCHED FOOTER NOTE & BREATHING SPACE
          ========================================================================= */}
      <DoodleNotebookDivider className="w-full max-w-2xl my-8 text-[#2B2B32]" />

      <footer className="relative flex flex-col sm:flex-row items-center justify-between text-xs font-doodle text-[#77777D] gap-2 select-none max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <span>·</span>
          <span>{greeting.formattedDate}</span>
          <span>·</span>
          <button
            onClick={() => refreshAll()}
            className="text-[#55555E] hover:text-[#EAE6DF] underline decoration-dotted text-[11px] transition-colors cursor-pointer"
            title="Refresh world snapshot"
          >
            refresh
          </button>
        </div>

        <span className="text-[#8E8E93]">
          ~ click any place to step inside ~
        </span>
      </footer>
    </div>
  );
}
