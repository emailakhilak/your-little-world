import ReturnButton from "@/components/ui/ReturnButton";

export default function MoonPage() {
  return (
    <main className="min-h-screen p-6 sm:p-12 flex flex-col items-center justify-center max-w-3xl mx-auto text-center">
      <div className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        {/* Subtle doodle mark */}
        <div
          aria-hidden="true"
          className="absolute top-5 right-6 text-xs font-doodle text-[#8B9BC2]/60 select-none"
        >
          · quiet reflections ·
        </div>

        {/* Emblem */}
        <div className="w-20 h-20 mx-auto rounded-full bg-[#1A2234] border border-[#6275A4]/30 flex items-center justify-center text-3xl mb-6 shadow-inner">
          🌙
        </div>

        {/* Title & Atmosphere */}
        <span className="text-xs uppercase tracking-widest text-[#8B9BC2] font-semibold">
          Quiet Sanctuary
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#EAE6DF] mt-2 mb-4 font-medium">
          The Moon Room
        </h1>
        <p className="text-[#9D978C] text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-6 font-sans">
          “A candlelit alcove for your innermost thoughts, honest daily feelings, vulnerable reflections, and absolute privacy.”
        </p>

        {/* Quiet Placeholder State */}
        <div className="py-6 px-4 bg-[#14161C] border border-[#252A34] rounded-2xl max-w-md mx-auto mb-8 text-xs text-[#9D978C]">
          <p className="font-serif italic text-sm text-[#8B9BC2] mb-1">
            The lantern flame burns soft and steady.
          </p>
          <p className="font-sans">
            Private encrypted diary records and reflective calendar moments will arrive in Phase 3.
          </p>
        </div>

        {/* Return to Living Room */}
        <ReturnButton />
      </div>
    </main>
  );
}
