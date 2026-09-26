import ReturnButton from "@/components/ui/ReturnButton";

export default function StorybookPage() {
  return (
    <main className="min-h-screen p-6 sm:p-12 flex flex-col items-center justify-center max-w-3xl mx-auto text-center">
      <div className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        {/* Subtle doodle mark */}
        <div
          aria-hidden="true"
          className="absolute top-5 right-6 text-xs font-doodle text-[#BA533C]/60 select-none"
        >
          ~ journey &amp; chapters
        </div>

        {/* Emblem */}
        <div className="w-20 h-20 mx-auto rounded-full bg-[#271E1D] border border-[#BA533C]/30 flex items-center justify-center text-3xl mb-6 shadow-inner">
          📖
        </div>

        {/* Title & Atmosphere */}
        <span className="text-xs uppercase tracking-widest text-[#BA533C] font-semibold">
          The Chronicles
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#EAE6DF] mt-2 mb-4 font-medium">
          The Storybook
        </h1>
        <p className="text-[#9D978C] text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-6 font-sans">
          “An illuminated chronicle of your engineering milestones, technologies mastered, lessons learned from challenges, and your evolving career journey.”
        </p>

        {/* Quiet Placeholder State */}
        <div className="py-6 px-4 bg-[#14161C] border border-[#252A34] rounded-2xl max-w-md mx-auto mb-8 text-xs text-[#9D978C]">
          <p className="font-serif italic text-sm text-[#BA533C] mb-1">
            The opening chapter is ready for your ink.
          </p>
          <p className="font-sans">
            Project logs, milestone timelines, and portfolio generation will arrive in Phase 5.
          </p>
        </div>

        {/* Return to Living Room */}
        <ReturnButton />
      </div>
    </main>
  );
}
