"use client";

import Link from "next/link";
import { MoonSnapshotState } from "@/lib/useDailySnapshot";

interface MoonRoomSnapshotProps {
  moon: MoonSnapshotState;
}

export default function MoonRoomSnapshot({ moon }: MoonRoomSnapshotProps) {
  const { status, error, hasEntry, mood, wordCount } = moon;

  return (
    <div className="w-full max-w-sm mx-auto mt-3">
      {/* Environmental Container: Moonlit Desk Blotter & Silk Bookmark */}
      <div className="relative rounded-2xl p-4 bg-[#151924]/90 border border-[#263146]/80 shadow-md backdrop-blur-xs transition-all hover:border-[#8B9BC2]/40">
        {/* Subtle Silk Ribbon Doodle Accent */}
        <div className="absolute top-2 right-3 text-xs font-doodle text-[#8B9BC2]/70 select-none pointer-events-none">
          · tonight&apos;s page ·
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-sm select-none" role="img" aria-hidden="true">
              🌙
            </span>
            <h3 className="font-serif text-xs font-medium uppercase tracking-wider text-[#C0CEEE]">
              Tonight&apos;s Reflection
            </h3>
          </div>

          {status === "success" && hasEntry && (
            <span className="text-[11px] font-sans text-[#A8B8DF] bg-[#1E2538] px-2 py-0.5 rounded-full border border-[#2B3852] flex items-center gap-1">
              <span className="text-[#E5B458]">✦</span> penned
            </span>
          )}
        </div>

        {/* Dynamic Content States */}
        {status === "loading" && (
          <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading reflection status">
            <div className="h-6 rounded-md bg-[#20273A]/60 animate-pulse" />
            <div className="h-6 rounded-md bg-[#20273A]/40 animate-pulse" />
          </div>
        )}

        {status === "error" && (
          <div className="py-2 text-center">
            <p className="text-xs text-[#9D978C] mb-1.5 font-sans">
              {error || "The moonlit alcove rests quietly."}
            </p>
            <Link
              href="/moon"
              className="inline-flex items-center text-xs text-[#8B9BC2] hover:text-[#B6C5EA] font-serif transition-colors"
            >
              Open the Moon Room →
            </Link>
          </div>
        )}

        {status === "empty" && !hasEntry && (
          <div className="py-2 text-center">
            <p className="text-xs text-[#9D978C] font-sans mb-2.5 leading-relaxed">
              Today&apos;s page is waiting quietly under the moonlight. No rush, whenever you are ready to unwind.
            </p>
            <Link
              href="/moon"
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-[#1E2436] hover:bg-[#252D42] border border-[#303E5C] text-xs font-serif text-[#C0CEEE] hover:text-[#E2EAFA] transition-all gap-1.5 group"
            >
              <span>Pen tonight&apos;s thoughts</span>
              <span className="group-hover:translate-x-0.5 transition-transform text-[#E5B458]">✍️</span>
            </Link>
          </div>
        )}

        {status === "success" && hasEntry && (
          <div className="py-1">
            <div className="p-2.5 rounded-xl bg-[#10141F]/60 border border-[#212B3E]/60 flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-base select-none">🕯️</span>
                <div>
                  <p className="text-xs font-serif text-[#E0DCCE]">
                    Today&apos;s journal page has been written.
                  </p>
                  <p className="text-[11px] text-[#9D978C] font-sans">
                    {wordCount > 0 ? `${wordCount} words penned quietly` : "Reflected today"}
                  </p>
                </div>
              </div>

              {mood && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1B2335] text-[#BACAE8] border border-[#2E3C59] font-sans capitalize">
                  {mood}
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#8695B8] italic font-serif text-center mb-1">
              Your words rest in quiet privacy behind the moon door.
            </p>
          </div>
        )}

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-[#212B3E]/70 flex items-center justify-between text-xs">
          <Link
            href="/moon"
            className="text-xs text-[#8B9BC2] hover:text-[#B6C5EA] transition-colors inline-flex items-center gap-1 font-serif group"
          >
            <span>{hasEntry ? "Revisit reflection" : "Step into the Moon Room"}</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>

          <span className="text-[11px] text-[#9D978C] font-sans">
            ✦ sanctuary
          </span>
        </div>
      </div>
    </div>
  );
}
