"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  StoryChapter,
  StoryChapterCreateInput,
  StoryChapterUpdateInput,
} from "@/lib/api";
import {
  DoodleStoryBookIcon,
  DoodleDividerFull,
} from "@/components/storybook/StoryDoodles";
import StoryBookCover from "@/components/storybook/StoryBookCover";
import ChapterCollection from "@/components/storybook/ChapterCollection";
import ChapterDetail from "@/components/storybook/ChapterDetail";
import NewChapterModal from "@/components/storybook/NewChapterModal";

type ViewMode = "home" | "all-stories" | "chapter-detail";

export default function StorybookPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [selectedChapter, setSelectedChapter] = useState<StoryChapter | null>(null);

  // Real backend chapters state
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New Chapter Modal state
  const [showNewChapterModal, setShowNewChapterModal] = useState<boolean>(false);

  // Load Storybook chapters on mount
  useEffect(() => {
    let cancelled = false;
    fetchChapters()
      .then((cList) => {
        if (!cancelled) {
          setChapters(cList.items);
        }
      })
      .catch((err) => {
        console.error("Failed to load Storybook chapters:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Navigation handlers
  const handleOpenAllStories = () => {
    setViewMode("all-stories");
  };

  const handleSelectChapter = (chapter: StoryChapter) => {
    setSelectedChapter(chapter);
    setViewMode("chapter-detail");
  };

  const handleBackToAllStories = () => {
    setViewMode("all-stories");
  };

  const handleBackToHome = () => {
    setViewMode("home");
  };

  // Chapter CRUD with instant state update
  const handleCreateChapter = async (data: StoryChapterCreateInput) => {
    try {
      const created = await createChapter(data);
      setChapters((prev) => [...prev, created]);
      setSelectedChapter(created);
      setViewMode("chapter-detail");
    } catch (err) {
      console.error("Failed to inscribe chapter:", err);
      throw err;
    }
  };

  const handleUpdateChapter = async (id: string, data: StoryChapterUpdateInput) => {
    try {
      const updated = await updateChapter(id, data);
      setChapters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelectedChapter(updated);
    } catch (err) {
      console.error("Failed to update chapter:", err);
      throw err;
    }
  };

  const handleDeleteChapter = async (id: string) => {
    try {
      await deleteChapter(id);
      setChapters((prev) => prev.filter((c) => c.id !== id));
      if (selectedChapter?.id === id) {
        setSelectedChapter(null);
        setViewMode("all-stories");
      }
    } catch (err) {
      console.error("Failed to delete chapter:", err);
      throw err;
    }
  };

  return (
    <main className="min-h-screen bg-[#0E0E10] text-[#EAE6DF] flex flex-col items-center px-4 py-8 sm:py-12 select-text font-sans">
      {/* =========================================================================
          TOP HEADER: 📖 StoryBook, Subtitle, [Return] to Living Room
          ========================================================================= */}
      <header className="w-full max-w-3xl flex flex-col mb-4">
        {/* Top row with Title/Icon on left, [Return] button in upper-right */}
        <div className="w-full flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hand-drawn Doodle StoryBook Icon */}
            <div
              onClick={handleBackToHome}
              className="w-10 h-10 flex items-center justify-center text-[#EAE6DF] hover:text-[#FFFFFF] cursor-pointer transition-colors"
              title="StoryBook Home"
            >
              <DoodleStoryBookIcon className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-serif text-[#F5F5F5] font-normal tracking-wide flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBackToHome}
                  className="hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-xs cursor-pointer"
                >
                  The StoryBook
                </button>
              </h1>
              <p className="text-xs sm:text-sm font-doodle text-[#8E8E93] tracking-wider mt-0.5">
                ~ look how far you&apos;ve come ~
              </p>
            </div>
          </div>

          {/* Discreet monochrome Return button in upper-right */}
          <Link
            href="/"
            className="text-xs font-doodle text-[#8E8E93] hover:text-[#FFFFFF] transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] rounded-full px-3 py-1 border border-[#2B2B32] hover:border-[#D4D4D8] bg-[#141417] cursor-pointer shrink-0"
            aria-label="Return to The Living Room"
          >
            <span>←</span>
            <span>Return</span>
          </Link>
        </div>

        {/* Subtle hand-drawn divider below header */}
        <DoodleDividerFull className="w-full max-w-3xl my-3" />
      </header>

      {/* =========================================================================
          DYNAMIC VIEW CONTENT: Loading | Home | All Stories | Chapter Detail
          ========================================================================= */}
      {loading && chapters.length === 0 ? (
        <div className="py-24 text-center font-doodle text-sm text-[#8E8E93] animate-pulse">
          Unrolling the quiet parchment...
        </div>
      ) : (
        <div className="w-full max-w-3xl flex flex-col items-center">
          {/* =====================================================================
              1. INITIAL STORYBOOK SCREEN
              ===================================================================== */}
          {viewMode === "home" && (
            <div className="w-full flex flex-col items-center">
              {/* "All Stories" as the main clickable section */}
              <section
                className="w-full max-w-2xl flex flex-col items-center my-3"
                aria-label="All Stories Navigation"
              >
                <button
                  type="button"
                  onClick={handleOpenAllStories}
                  className="group inline-flex items-center gap-3 px-6 py-2.5 rounded-full border border-dashed border-[#44444C] bg-[#141417] hover:border-[#D4D4D8] hover:bg-[#1A1A1E] text-xs sm:text-sm font-doodle text-[#CCCCCC] hover:text-[#FFFFFF] transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#FFFFFF] shadow-xs"
                >
                  <span>📖</span>
                  <span className="tracking-wide">All Stories</span>
                  <span className="text-[11px] font-mono text-[#8E8E93] group-hover:text-[#FFFFFF]">
                    ({chapters.length})
                  </span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </section>

              {/* Hand-drawn divider between All Stories and Story container */}
              <DoodleDividerFull className="w-full max-w-2xl my-2" />

              {/* One large central hand-drawn story/book-like container */}
              <div className="w-full mt-2">
                <StoryBookCover
                  chapters={chapters}
                  onSelectChapter={handleSelectChapter}
                  onNewChapter={() => setShowNewChapterModal(true)}
                />
              </div>
            </div>
          )}

          {/* =====================================================================
              2. ALL STORIES (Chapter Collection View - Stories ONLY)
              ===================================================================== */}
          {viewMode === "all-stories" && (
            <div className="w-full">
              <ChapterCollection
                chapters={chapters}
                onSelectChapter={handleSelectChapter}
                onNewChapter={() => setShowNewChapterModal(true)}
                onBackToHome={handleBackToHome}
              />
            </div>
          )}

          {/* =====================================================================
              3. CHAPTER DETAIL VIEW (Reading + Editing in-place)
              ===================================================================== */}
          {viewMode === "chapter-detail" && selectedChapter && (
            <ChapterDetail
              chapter={selectedChapter}
              onBackToAllStories={handleBackToAllStories}
              onUpdateChapter={handleUpdateChapter}
              onDeleteChapter={handleDeleteChapter}
            />
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: Inscribe New Chapter
          ========================================================================= */}
      <NewChapterModal
        isOpen={showNewChapterModal}
        onClose={() => setShowNewChapterModal(false)}
        onSubmit={handleCreateChapter}
        orderIndex={chapters.length + 1}
      />
    </main>
  );
}
