"use client";

import { useEffect, useState } from "react";
import ReturnButton from "@/components/ui/ReturnButton";
import {
  fetchNewsArticles,
  NewsArticle,
  NEWS_CATEGORIES,
  NewsCategoryType,
  triggerNewsIngestion,
} from "@/lib/api";

export default function WindowPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategoryType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    const categoryParam = selectedCategory !== "all" ? selectedCategory : undefined;

    fetchNewsArticles({ category: categoryParam, limit: 50 })
      .then((res) => {
        if (!ignore) {
          setArticles(res.items);
          setTotal(res.total);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to load dispatches.";
          setError(msg);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedCategory, refreshKey]);

  const handleIngest = async () => {
    setIsIngesting(true);
    setStatusMessage(null);
    setError(null);
    try {
      const categoryParam = selectedCategory !== "all" ? selectedCategory : undefined;
      const stats = await triggerNewsIngestion({
        category: categoryParam,
        sync_sources: true,
      });
      setStatusMessage(
        `Dispatches retrieved: ${stats.articles_added} new (${stats.articles_seen} seen across ${stats.sources_processed} sources).`
      );
      const res = await fetchNewsArticles({ category: categoryParam, limit: 50 });
      setArticles(res.items);
      setTotal(res.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to refresh feeds.";
      setError(msg);
    } finally {
      setIsIngesting(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Recently";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch {
      return "Recently";
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 flex flex-col items-center max-w-4xl mx-auto">
      {/* Return button row */}
      <div className="w-full flex items-center justify-between mb-6">
        <ReturnButton />
        <div
          aria-hidden="true"
          className="text-xs font-doodle text-[#6275A4]/80 select-none"
        >
          ✧ the faraway window · dispatches ~
        </div>
      </div>

      {/* Main Header Card */}
      <header className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1D2534] border border-[#6275A4]/40 flex items-center justify-center text-3xl shadow-inner shrink-0">
            🪟
          </div>
          <div className="text-center sm:text-left flex-1">
            <span className="text-[11px] uppercase tracking-widest text-[#6275A4] font-semibold">
              The Horizon
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#EAE6DF] mt-1 font-medium">
              The Faraway Window
            </h1>
            <p className="text-[#9D978C] text-sm sm:text-base mt-2 leading-relaxed">
              Curated dispatches across AI, deep space missions, forensic mysteries, and software engineering.
            </p>
          </div>
          <button
            onClick={handleIngest}
            disabled={isIngesting}
            className="mt-3 sm:mt-0 px-4 py-2 bg-[#252A36] hover:bg-[#2F3545] active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-xs font-medium text-[#EAE6DF] border border-[#3B4254] rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>{isIngesting ? "🔭 Scanning horizon..." : "🔭 Look through window"}</span>
          </button>
        </div>

        {/* Status notification banner */}
        {statusMessage && (
          <div className="mt-4 py-2 px-3 bg-[#1D2534]/60 border border-[#6275A4]/30 rounded-xl text-xs text-[#A8B4D4] flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-[#6275A4] hover:text-[#EAE6DF] ml-2 font-mono"
            >
              ×
            </button>
          </div>
        )}
      </header>

      {/* Category Filter Pills */}
      <nav aria-label="News categories" className="w-full mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#6275A4]/25 border-[#6275A4] text-[#EAE6DF]"
                : "bg-[#14161C] border-[#252A34] text-[#9D978C] hover:border-[#3B4254] hover:text-[#EAE6DF]"
            }`}
          >
            ✨ All Dispatches
          </button>
          {(Object.keys(NEWS_CATEGORIES) as NewsCategoryType[]).map((catKey) => {
            const meta = NEWS_CATEGORIES[catKey];
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#6275A4]/25 border-[#6275A4] text-[#EAE6DF]"
                    : "bg-[#14161C] border-[#252A34] text-[#9D978C] hover:border-[#3B4254] hover:text-[#EAE6DF]"
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Error state */}
      {error && (
        <div className="w-full p-4 mb-6 bg-[#251A1C] border border-[#52292E] rounded-2xl text-xs text-[#E5A8A8] flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="underline hover:text-white ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Article Feed Section */}
      <section className="w-full space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-[#9D978C] text-sm">
            <div className="inline-block animate-pulse text-2xl mb-2">✧</div>
            <p className="font-serif italic">Gazing past the clouds...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="w-full py-16 px-6 bg-[#1A1D24] border border-[#2B303C] rounded-3xl text-center">
            <div className="text-3xl mb-3">🌤️</div>
            <h2 className="font-serif text-lg text-[#EAE6DF] font-medium mb-1">
              The sky is clear and quiet
            </h2>
            <p className="text-xs text-[#9D978C] max-w-sm mx-auto mb-6">
              No dispatches have drifted in for this view yet. Tap below to look through the window and fetch the latest stories.
            </p>
            <button
              onClick={handleIngest}
              disabled={isIngesting}
              className="px-4 py-2 bg-[#6275A4]/20 hover:bg-[#6275A4]/30 border border-[#6275A4]/50 rounded-xl text-xs text-[#EAE6DF] transition-all cursor-pointer"
            >
              {isIngesting ? "Fetching..." : "Fetch Latest Dispatches"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-[#9D978C] px-1 pb-1">
              <span>
                Showing {articles.length} of {total} {total === 1 ? "dispatch" : "dispatches"}
              </span>
            </div>

            <div className="space-y-3">
              {articles.map((art) => {
                const catMeta = NEWS_CATEGORIES[art.category as NewsCategoryType];
                return (
                  <article
                    key={art.id}
                    className="p-5 bg-[#1A1D24] border border-[#2B303C] hover:border-[#3B4254] rounded-2xl transition-all text-left flex flex-col justify-between group"
                  >
                    <div>
                      {/* Meta header: Category, Source, Date */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#9D978C] mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#14161C] border border-[#252A34] text-[#A8B4D4] font-medium">
                          {catMeta?.icon || "📰"} {catMeta?.label || art.category}
                        </span>
                        <span>•</span>
                        <span className="text-[#EAE6DF]/80 font-medium">
                          {art.source_name || "External Dispatch"}
                        </span>
                        {art.author && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[150px]">by {art.author}</span>
                          </>
                        )}
                        <span>•</span>
                        <time dateTime={art.published_at || undefined}>
                          {formatDate(art.published_at)}
                        </time>
                      </div>

                      {/* Title */}
                      <h2 className="text-base sm:text-lg font-serif font-medium text-[#EAE6DF] group-hover:text-[#A8B4D4] transition-colors leading-snug mb-2">
                        <a
                          href={art.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline focus:outline-none focus:ring-1 focus:ring-[#6275A4] rounded"
                        >
                          {art.title}
                        </a>
                      </h2>

                      {/* Short Description */}
                      {art.description && (
                        <p className="text-xs sm:text-sm text-[#9D978C] line-clamp-3 leading-relaxed mb-3 font-sans">
                          {art.description}
                        </p>
                      )}
                    </div>

                    {/* External Link */}
                    <div className="pt-2 border-t border-[#252A34] flex items-center justify-between text-xs">
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6275A4] hover:text-[#A8B4D4] font-medium flex items-center gap-1 transition-colors"
                      >
                        <span>Read original dispatch</span>
                        <span aria-hidden="true">↗</span>
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
