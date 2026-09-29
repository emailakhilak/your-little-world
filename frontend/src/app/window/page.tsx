"use client";

import { useEffect, useState } from "react";
import ReturnButton from "@/components/ui/ReturnButton";
import {
  DailyEdition,
  fetchNewsArticles,
  fetchTodayEdition,
  markArticleAsRead,
  NEWS_CATEGORIES,
  NewsArticle,
  NewsCategoryType,
  summarizeArticle,
  triggerNewsIngestion,
} from "@/lib/api";

export default function WindowPage() {
  const [activeTab, setActiveTab] = useState<"edition" | "all">("edition");
  const [todayEdition, setTodayEdition] = useState<DailyEdition | null>(null);
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<NewsCategoryType | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isIngesting, setIsIngesting] = useState(false);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load Today's Edition and Articles
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        const categoryParam = selectedCategory !== "all" ? selectedCategory : undefined;
        const [editionRes, articlesRes] = await Promise.all([
          fetchTodayEdition().catch(() => null),
          fetchNewsArticles({ category: categoryParam, limit: 50 }),
        ]);

        if (!ignore) {
          setTodayEdition(editionRes);
          setArticles(articlesRes.items);
          setTotal(articlesRes.total);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Failed to gaze through the window.";
          setError(msg);
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [selectedCategory, refreshKey]);

  // Handle Fetch / Ingestion
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
        `Dispatches gathered: ${stats.articles_added} new (${stats.articles_seen} observed across ${stats.sources_processed} sources).`
      );
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to scan the horizon.";
      setError(msg);
    } finally {
      setIsIngesting(false);
    }
  };

  // Mark article read
  const handleArticleClick = async (articleId: string) => {
    try {
      await markArticleAsRead(articleId);
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, is_read: true } : a))
      );
      if (todayEdition) {
        setTodayEdition({
          ...todayEdition,
          edition_articles: todayEdition.edition_articles.map((item) =>
            item.article.id === articleId
              ? { ...item, article: { ...item.article, is_read: true } }
              : item
          ),
        });
      }
    } catch {
      // Non-critical, ignore
    }
  };

  // Trigger on-demand AI summarization
  const handleSummarize = async (articleId: string) => {
    setSummarizingId(articleId);
    try {
      const updatedArticle = await summarizeArticle(articleId, true);
      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? updatedArticle : a))
      );
      if (todayEdition) {
        setTodayEdition({
          ...todayEdition,
          edition_articles: todayEdition.edition_articles.map((item) =>
            item.article.id === articleId ? { ...item, article: updatedArticle } : item
          ),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to gather deeper insight right now.";
      setError(msg);
    } finally {
      setSummarizingId(null);
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

  const currentDisplayArticles: NewsArticle[] =
    activeTab === "edition" && todayEdition
      ? todayEdition.edition_articles.map((ea) => ea.article)
      : articles;

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 flex flex-col items-center max-w-4xl mx-auto">
      {/* Return button row with celestial annotation */}
      <div className="w-full flex items-center justify-between mb-6">
        <ReturnButton />
        <div
          aria-hidden="true"
          className="text-xs font-doodle text-[#6275A4]/80 select-none"
        >
          ✧ gaze outside · whispers of the world ~
        </div>
      </div>

      {/* Atmospheric Window Frame Header */}
      <header className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-6">
        {/* Subtle decorative window pane lines */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-5 flex justify-around"
        >
          <div className="w-px h-full bg-[#EAE6DF]" />
          <div className="w-px h-full bg-[#EAE6DF]" />
          <div className="w-px h-full bg-[#EAE6DF]" />
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-[#1D2534] border border-[#6275A4]/40 flex items-center justify-center text-3xl shadow-inner shrink-0">
            🪟
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[11px] uppercase tracking-widest text-[#6275A4] font-semibold">
                The Horizon
              </span>
              <span className="text-xs text-[#9D978C]/70">•</span>
              <span className="text-xs font-mono text-[#9D978C]/80">8 PM Daily Edition</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#EAE6DF] mt-1 font-medium">
              The Faraway Window
            </h1>
            <p className="text-[#9D978C] text-sm sm:text-base mt-2 leading-relaxed font-sans">
              Quiet dispatches across artificial intelligence, ancient mysteries, cosmic explorations, and software craft.
            </p>
          </div>
          <button
            onClick={handleIngest}
            disabled={isIngesting}
            className="mt-3 sm:mt-0 px-4 py-2.5 bg-[#252A36] hover:bg-[#2F3545] active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-xs font-medium text-[#EAE6DF] border border-[#3B4254] rounded-xl transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <span>{isIngesting ? "🔭 Scanning horizon..." : "🔭 Look through window"}</span>
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div className="mt-4 py-2 px-3 bg-[#1D2534]/60 border border-[#6275A4]/30 rounded-xl text-xs text-[#A8B4D4] flex items-center justify-between">
            <span>{statusMessage}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-[#6275A4] hover:text-[#EAE6DF] ml-2 font-mono cursor-pointer"
            >
              ×
            </button>
          </div>
        )}
      </header>

      {/* Main View Mode Selector (Daily Edition vs All Dispatches) */}
      <div className="w-full flex items-center justify-between border-b border-[#252A34] pb-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("edition")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "edition"
                ? "bg-[#6275A4]/25 text-[#EAE6DF] border border-[#6275A4]/50"
                : "text-[#9D978C] hover:text-[#EAE6DF]"
            }`}
          >
            <span>✨</span>
            <span>Today&apos;s Edition</span>
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "all"
                ? "bg-[#6275A4]/25 text-[#EAE6DF] border border-[#6275A4]/50"
                : "text-[#9D978C] hover:text-[#EAE6DF]"
            }`}
          >
            <span>📜</span>
            <span>All Dispatches</span>
          </button>
        </div>

        {activeTab === "all" && (
          <div className="text-xs text-[#9D978C]">
            {total} total
          </div>
        )}
      </div>

      {/* Category Filter Pills (Shown in All Dispatches mode) */}
      {activeTab === "all" && (
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
              ✨ All Topics
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
      )}

      {/* Error state */}
      {error && (
        <div className="w-full p-4 mb-6 bg-[#251A1C] border border-[#52292E] rounded-2xl text-xs text-[#E5A8A8] flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="underline hover:text-white ml-3 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Articles Stream */}
      <section className="w-full space-y-4">
        {isLoading ? (
          <div className="py-16 text-center text-[#9D978C] text-sm">
            <div className="inline-block animate-pulse text-2xl mb-2">✧</div>
            <p className="font-serif italic">Gazing through the windowpane...</p>
          </div>
        ) : currentDisplayArticles.length === 0 ? (
          <div className="w-full py-16 px-6 bg-[#1A1D24] border border-[#2B303C] rounded-3xl text-center">
            <div className="text-3xl mb-3">🌤️</div>
            <h2 className="font-serif text-lg text-[#EAE6DF] font-medium mb-1">
              The sky is clear and quiet
            </h2>
            <p className="text-xs text-[#9D978C] max-w-sm mx-auto mb-6">
              No dispatches have drifted in for this view yet. Tap below to look through the window and scan the latest horizons.
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
          <div className="space-y-4">
            {currentDisplayArticles.map((art) => {
              const catMeta = NEWS_CATEGORIES[art.category as NewsCategoryType];
              const isSummarizingThis = summarizingId === art.id;

              return (
                <article
                  key={art.id}
                  className={`p-5 sm:p-6 bg-[#1A1D24] border rounded-2xl transition-all text-left flex flex-col justify-between group ${
                    art.is_read
                      ? "border-[#252A34] opacity-80"
                      : "border-[#2B303C] hover:border-[#3B4254] shadow-sm"
                  }`}
                >
                  <div>
                    {/* Meta row: Category, Source, Date, Read status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#9D978C] mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
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
                            <span className="truncate max-w-[140px]">by {art.author}</span>
                          </>
                        )}
                        <span>•</span>
                        <time dateTime={art.published_at || undefined}>
                          {formatDate(art.published_at)}
                        </time>
                      </div>

                      {/* Reading History Pill */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          art.is_read
                            ? "bg-[#252A34] text-[#9D978C]"
                            : "bg-[#6275A4]/20 text-[#A8B4D4] border border-[#6275A4]/30"
                        }`}
                      >
                        {art.is_read ? "✓ Read" : "New"}
                      </span>
                    </div>

                    {/* Article Title with direct link */}
                    <h2 className="text-base sm:text-lg font-serif font-medium text-[#EAE6DF] group-hover:text-[#A8B4D4] transition-colors leading-snug mb-2">
                      <a
                        href={art.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => handleArticleClick(art.id)}
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

                    {/* AI Summary and Key Points section */}
                    {art.summary ? (
                      <div className="mt-4 p-4 rounded-xl bg-[#14171E] border border-[#2B303C]/80 text-xs text-[#EAE6DF] space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#252A34] pb-1.5 text-[11px] text-[#A8B4D4]">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span>✦</span>
                            <span>Archivist&apos;s Synthesis</span>
                          </span>
                          <span className="text-[10px] font-mono text-[#9D978C]/70">
                            {art.summary_provider || "ai"}
                          </span>
                        </div>
                        <p className="leading-relaxed font-sans text-[#D4D0C8]">
                          {art.summary}
                        </p>
                        {art.key_points && art.key_points.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[10px] uppercase tracking-wider text-[#9D978C] font-semibold block mb-1">
                              Key Findings
                            </span>
                            <ul className="space-y-1 pl-1 text-[#C4C0B8]">
                              {art.key_points.map((pt, idx) => (
                                <li key={idx} className="flex items-start gap-1.5 leading-snug">
                                  <span className="text-[#6275A4] text-[10px] mt-0.5">✦</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {art.why_it_matters && (
                          <div className="pt-2 border-t border-[#252A34]/60 text-[#B3835B] font-serif italic text-[11px] leading-relaxed">
                            “{art.why_it_matters}”
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center">
                        <button
                          onClick={() => handleSummarize(art.id)}
                          disabled={isSummarizingThis}
                          className="text-[11px] text-[#6275A4] hover:text-[#A8B4D4] font-medium flex items-center gap-1 transition-colors cursor-pointer py-1"
                        >
                          <span>{isSummarizingThis ? "✦ Distilling wisdom..." : "✦ Gaze deeper with AI"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* External Link & Mark as read */}
                  <div className="pt-3 mt-3 border-t border-[#252A34] flex items-center justify-between text-xs">
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleArticleClick(art.id)}
                      className="text-[#6275A4] hover:text-[#A8B4D4] font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Read original dispatch</span>
                      <span aria-hidden="true">↗</span>
                    </a>

                    {!art.is_read && (
                      <button
                        onClick={() => handleArticleClick(art.id)}
                        className="text-[11px] text-[#9D978C] hover:text-[#EAE6DF] cursor-pointer"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Atmospheric Footer Seal */}
      <footer className="mt-12 text-center text-xs text-[#8C7A6B] flex items-center justify-center space-x-3 select-none pb-6">
        <span className="font-serif italic">The Faraway Window</span>
        <span>•</span>
        <span className="font-doodle text-sm text-[#6275A4]/70">
          gaze softly toward tomorrow
        </span>
      </footer>
    </main>
  );
}
