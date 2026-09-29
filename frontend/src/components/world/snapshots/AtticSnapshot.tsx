"use client";

import Link from "next/link";
import { AtticSnapshotState } from "@/lib/useDailySnapshot";

interface AtticSnapshotProps {
  attic: AtticSnapshotState;
}

export default function AtticSnapshot({ attic }: AtticSnapshotProps) {
  const { status, error, note } = attic;

  return (
    <div className="w-full max-w-sm mx-auto mt-3">
      {/* Environmental Container: Pinned Manuscript Paper on the Attic Desk */}
      <div className="relative rounded-2xl p-4 bg-[#1E1915]/90 border border-[#362A1F]/80 shadow-md backdrop-blur-xs transition-all hover:border-[#B3835B]/40">
        {/* Subtle Brass Tack Doodle Accent */}
        <div className="absolute top-2 right-3 text-xs font-doodle text-[#B3835B]/70 select-none pointer-events-none">
          ~ recent spark ~
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-sm select-none" role="img" aria-hidden="true">
              🕯️
            </span>
            <h3 className="font-serif text-xs font-medium uppercase tracking-wider text-[#DFC4A6]">
              Recent Spark
            </h3>
          </div>

          {note?.is_pinned && (
            <span className="text-[11px] font-sans text-[#E5B458] bg-[#2A2219] px-2 py-0.5 rounded-full border border-[#403322] flex items-center gap-1">
              📌 pinned
            </span>
          )}
        </div>

        {/* Dynamic Content States */}
        {status === "loading" && (
          <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading notes snapshot">
            <div className="h-6 rounded-md bg-[#2B231B]/60 animate-pulse" />
            <div className="h-6 rounded-md bg-[#2B231B]/40 animate-pulse" />
          </div>
        )}

        {status === "empty" && (
          <div className="py-2.5 text-center">
            <p className="text-xs text-[#9D978C] font-sans mb-2">
              The desk is clear. Fresh ink is waiting for your next thought.
            </p>
            <Link
              href="/attic"
              className="inline-flex items-center text-xs text-[#B3835B] hover:text-[#DEAB7E] font-serif transition-colors"
            >
              Jot a spark in the Attic →
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="py-2 text-center">
            <p className="text-xs text-[#9D978C] mb-1.5 font-sans">
              {error || "The attic desk rests quietly."}
            </p>
            <Link
              href="/attic"
              className="inline-flex items-center text-xs text-[#B3835B] hover:text-[#DEAB7E] font-serif transition-colors"
            >
              Open the Little Attic →
            </Link>
          </div>
        )}

        {status === "success" && note && (
          <Link
            href={`/attic`}
            className="block p-2.5 rounded-xl bg-[#14100D]/60 hover:bg-[#201A14] border border-[#2D2218]/60 transition-colors group mb-2.5"
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-serif font-medium text-xs text-[#EAE6DF] group-hover:text-[#F3D7B5] transition-colors line-clamp-1">
                {note.title || "Untitled Spark"}
              </span>

              {note.category && (
                <span className="shrink-0 text-[10px] uppercase font-sans tracking-wider px-1.5 py-0.5 rounded-xs bg-[#2A2117] text-[#C49E77] border border-[#3E3020]">
                  {note.category}
                </span>
              )}
            </div>

            <p className="text-xs font-sans text-[#A89F93] line-clamp-2 leading-relaxed">
              {note.content || "Empty note content."}
            </p>
          </Link>
        )}

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-[#2D2218]/70 flex items-center justify-between text-xs">
          <Link
            href="/attic"
            className="text-xs text-[#B3835B] hover:text-[#DEAB7E] transition-colors inline-flex items-center gap-1 font-serif group"
          >
            <span>Visit the Attic</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>

          {note && (
            <span className="text-[11px] text-[#9D978C] font-sans">
              sparks &amp; ink
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
