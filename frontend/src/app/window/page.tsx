import ReturnButton from "@/components/ui/ReturnButton";

export default function WindowPage() {
  return (
    <main className="min-h-screen p-6 sm:p-12 flex flex-col items-center justify-center max-w-3xl mx-auto text-center">
      <div className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        {/* Subtle doodle mark */}
        <div
          aria-hidden="true"
          className="absolute top-5 right-6 text-xs font-doodle text-[#6275A4]/60 select-none"
        >
          ✧ far horizons ~
        </div>

        {/* Emblem */}
        <div className="w-20 h-20 mx-auto rounded-full bg-[#1D2534] border border-[#6275A4]/30 flex items-center justify-center text-3xl mb-6 shadow-inner">
          🪟
        </div>

        {/* Title & Atmosphere */}
        <span className="text-xs uppercase tracking-widest text-[#6275A4] font-semibold">
          The Horizon
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#EAE6DF] mt-2 mb-4 font-medium">
          The Faraway Window
        </h1>
        <p className="text-[#9D978C] text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-6 font-sans">
          “A clear casement looking out upon discoveries, curiosities, space explorations, detective enigmas, and dispatches from the world beyond.”
        </p>

        {/* Quiet Placeholder State */}
        <div className="py-6 px-4 bg-[#14161C] border border-[#252A34] rounded-2xl max-w-md mx-auto mb-8 text-xs text-[#9D978C]">
          <p className="font-serif italic text-sm text-[#6275A4] mb-1">
            The sky is clear and quiet.
          </p>
          <p className="font-sans">
            Curated feeds across AI, ISRO, NASA, and engineering will arrive in Phase 4.
          </p>
        </div>

        {/* Return to Living Room */}
        <ReturnButton />
      </div>
    </main>
  );
}
