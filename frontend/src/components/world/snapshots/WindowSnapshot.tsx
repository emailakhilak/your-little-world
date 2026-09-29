"use client";

import Link from "next/link";
import { NewsSnapshotState } from "@/lib/useDailySnapshot";
import { NEWS_CATEGORIES, NewsCategoryType } from "@/lib/api";

interface WindowSnapshotProps {
  news: NewsSnapshotState;
}

export default function WindowSnapshot({ news }: WindowSnapshotProps) {
  const { status, error, edition, articles } = news;

  return (
    <div className="w-full max-w-sm mx-auto mt-3">
      {/* Environmental Container: Folded Window Sill Gazette / Dispatch */}
      <div className="relative rounded-2xl p-4 bg-[#171C26]/90 border border-[#2B3548]/80 shadow-md backdrop-blur-xs transition-all hover:border-[#6275A4]/40">
        {/* Subtle Gazette Doodle Accent */}
        <div className="absolute top-2 right-3 text-xs font-doodle text-[#6275A4]/70 select-none pointer-events-none">
          ~ window sill dispatch ~
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-sm select-none" role="img" aria-hidden="true">
              🪟
            </span>
            <h3 className="font-serif text-xs font-medium uppercase tracking-wider text-[#BAC9EB]">
              Today&apos;s Dispatch
            </h3>
          </div>

          {edition && (
            <span className="text-[11px] font-sans text-[#8FA5D9] bg-[#1E2638] px-2 py-0.5 rounded-full border border-[#2D3A54]">
              {edition.edition_date}
            </span>
          )}
        </div>

        {/* Dynamic Content States */}
        {status === "loading" && (
          <div className="space-y-2 py-1" aria-busy="true" aria-label="Loading news dispatch">
            <div className="h-6 rounded-md bg-[#222B3D]/60 animate-pulse" />
            <div className="h-6 rounded-md bg-[#222B3D]/40 animate-pulse" />
          </div>
        )}

        {status === "empty" && (
          <div className="py-2.5 text-center">
            <p className="text-xs text-[#9D978C] font-sans mb-2">
              No dispatch delivered yet today. The window remains open to starry skies.
            </p>
            <Link
              href="/window"
              className="inline-flex items-center text-xs text-[#8FA5D9] hover:text-[#B8CAED] font-serif transition-colors"
            >
              Gaze through the Window →
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="py-2 text-center">
            <p className="text-xs text-[#9D978C] mb-1.5 font-sans">
              {error || "The distant horizon is shrouded in mist."}
            </p>
            <Link
              href="/window"
              className="inline-flex items-center text-xs text-[#8FA5D9] hover:text-[#B8CAED] font-serif transition-colors"
            >
              Open The Faraway Window →
            </Link>
          </div>
        )}

        {status === "success" && articles.length > 0 && (
          <ul className="space-y-2 mb-2.5" role="list">
            {articles.map((article) => {
              const catMeta = NEWS_CATEGORIES[article.category as NewsCategoryType];
              const isUnread = article.is_read === false;

              return (
                <li
                  key={article.id}
                  className="p-2 rounded-lg bg-[#121620]/60 hover:bg-[#1C2333] border border-[#232C3E]/60 transition-colors group"
                >
                  <Link href={`/window?article=${article.id}`} className="block focus:outline-none">
                    <div className="flex items-center justify-between text-[11px] text-[#8695B8] mb-1">
                      <span className="flex items-center space-x-1 font-sans">
                        <span>{catMeta ? catMeta.icon : "✦"}</span>
                        <span>{catMeta ? catMeta.label.split("&")[0].trim() : article.category}</span>
                      </span>

                      <div className="flex items-center space-x-1.5">
                        {isUnread && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E5B458] shadow-[0_0_4px_#E5B458]" title="Unread article" />
                        )}
                        {article.source_name && (
                          <span className="text-[10px] text-[#9D978C] truncate max-w-[100px]">
                            {article.source_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs font-serif text-[#E0DCCE] group-hover:text-[#BAC9EB] line-clamp-1 transition-colors leading-snug">
                      {article.title}
                    </h4>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer Navigation Link */}
        <div className="pt-2 border-t border-[#232C3E]/70 flex items-center justify-between text-xs">
          <Link
            href="/window"
            className="text-xs text-[#8FA5D9] hover:text-[#B8CAED] transition-colors inline-flex items-center gap-1 font-serif group"
          >
            <span>Look out the Window</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>

          {articles.length > 0 && (
            <span className="text-[11px] text-[#9D978C] font-sans">
              {articles.length} dispatches
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
