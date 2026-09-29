"use client";

import GardenPortal from "./GardenPortal";
import WindowPortal from "./WindowPortal";
import AtticPortal from "./AtticPortal";
import MoonRoomPortal from "./MoonRoomPortal";
import StorybookPortal from "./StorybookPortal";

import GardenSnapshot from "./snapshots/GardenSnapshot";
import WindowSnapshot from "./snapshots/WindowSnapshot";
import AtticSnapshot from "./snapshots/AtticSnapshot";
import MoonRoomSnapshot from "./snapshots/MoonRoomSnapshot";
import StorybookSnapshot from "./snapshots/StorybookSnapshot";

import { useDailySnapshot } from "@/lib/useDailySnapshot";

export default function WorldScene() {
  const {
    greeting,
    garden,
    news,
    attic,
    moon,
    storybook,
    refreshAll,
  } = useDailySnapshot();

  return (
    <div className="relative w-full max-w-6xl mx-auto my-auto">
      {/* Background Architectural Atmosphere: Dark Cozy Room / Night Notebook */}
      <div className="relative rounded-3xl p-5 sm:p-8 md:p-12 bg-gradient-to-b from-[#1A1D24]/95 to-[#15171D]/95 border border-[#2B303C] shadow-2xl overflow-hidden">
        {/* Subtle Ambient Night Stippling / Paper Grain Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen bg-[radial-gradient(#C2A882_1px,transparent_1px)] [background-size:20px_20px]" />

        {/* Ambient Top Ceiling Warm Candlelight Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-36 bg-gradient-to-b from-[#E5B458]/10 to-transparent blur-3xl pointer-events-none" />

        {/* Organic Hand-Drawn Doodle Accents */}
        <div
          aria-hidden="true"
          className="absolute top-6 left-7 text-[#A8A092]/35 select-none pointer-events-none font-doodle text-sm rotate-[-8deg]"
        >
          ✦ * ˚
        </div>

        <div
          aria-hidden="true"
          className="absolute top-7 right-8 text-[#A8A092]/35 select-none pointer-events-none font-doodle text-sm rotate-[5deg] hidden sm:block"
        >
          ~ daily snapshot ~
        </div>

        {/* Scene Heading: An Intimate Welcome & Daily Snapshot */}
        <header className="relative text-center mb-8 sm:mb-12">
          {/* Eyebrow: Current Formatted Date in User Timezone */}
          <div className="inline-flex items-center space-x-2 text-xs uppercase tracking-widest text-[#9D978C] font-medium mb-2">
            <span className="text-[#E5B458]/70">✦</span>
            <span>{greeting.formattedDate}</span>
            <span className="text-[#E5B458]/70">✦</span>
          </div>

          {/* Contextual Greeting */}
          <div className="relative inline-block">
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight text-[#EAE6DF]">
              {greeting.greeting}
            </h1>
            {/* Subtle hand-drawn vector underline */}
            <svg
              viewBox="0 0 240 12"
              className="w-48 sm:w-56 mx-auto mt-1 text-[#E5B458]/40 fill-none stroke-current"
              strokeWidth="1.5"
              strokeLinecap="round"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M4 8 C50 4, 100 10, 160 5 C190 3, 220 8, 236 6" />
            </svg>
          </div>

          {/* Quiet Subtitle */}
          <p className="mt-2 text-sm sm:text-base text-[#9D978C] max-w-lg mx-auto font-sans leading-relaxed">
            {greeting.subtitle}
          </p>
        </header>

        {/* The Living Room Environment: Interactive Physical Portals & Environmental Snapshots */}
        <div className="relative z-10 space-y-8 sm:space-y-12">
          {/* Upper Horizon: Sky & Night (Faraway Window + Moon Room) */}
          <section
            aria-label="Upper Sky and Night Horizon"
            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-4xl mx-auto items-start"
          >
            {/* 🪟 The Faraway Window Area */}
            <div className="flex flex-col items-center">
              <WindowPortal />
              <WindowSnapshot news={news} />
            </div>

            {/* 🌙 The Moon Room Area */}
            <div className="flex flex-col items-center">
              <MoonRoomPortal />
              <MoonRoomSnapshot moon={moon} />
            </div>
          </section>

          {/* Organic floating doodle annotation between upper and lower levels */}
          <div
            aria-hidden="true"
            className="flex items-center justify-center space-x-3 text-xs font-doodle text-[#9D978C]/40 select-none my-2"
          >
            <span>·</span>
            <span>✧</span>
            <span>small quiet corners</span>
            <span>✧</span>
            <span>·</span>
          </div>

          {/* Lower Sanctuary: Studio, Garden & Storybook */}
          <section
            aria-label="Lower Studio and Growth Sanctuary"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start max-w-5xl mx-auto"
          >
            {/* 🌱 Garden of Tomorrow */}
            <div className="flex flex-col items-center">
              <GardenPortal />
              <GardenSnapshot garden={garden} />
            </div>

            {/* 🕯️ The Little Attic */}
            <div className="flex flex-col items-center">
              <AtticPortal />
              <AtticSnapshot attic={attic} />
            </div>

            {/* 📖 The Storybook */}
            <div className="flex flex-col items-center">
              <StorybookPortal />
              <StorybookSnapshot storybook={storybook} />
            </div>
          </section>
        </div>

        {/* Wooden Baseline Floor Trim */}
        <div className="relative mt-10 pt-6 border-t border-[#2B303C]/80 flex flex-col sm:flex-row items-center justify-between text-xs text-[#9D978C] gap-2">
          <div className="flex items-center space-x-2 font-sans">
            <span className="inline-block w-2 h-2 rounded-full bg-[#86A868]" />
            <span>The world is quiet and ready</span>
            <button
              onClick={() => refreshAll()}
              className="text-[#9D978C] hover:text-[#EAE6DF] underline decoration-dotted text-[11px] ml-2 transition-colors cursor-pointer"
              title="Refresh daily snapshot"
            >
              refresh
            </button>
          </div>
          <span className="font-doodle text-sm text-[#A8A092]/80">
            ~ click any object or note to step inside ~
          </span>
        </div>
      </div>
    </div>
  );
}
