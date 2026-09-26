import ReturnButton from "@/components/ui/ReturnButton";

export default function AtticPage() {
  return (
    <main className="min-h-screen p-6 sm:p-12 flex flex-col items-center justify-center max-w-3xl mx-auto text-center">
      <div className="w-full bg-[#1A1D24] border border-[#2B303C] rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
        {/* Subtle doodle mark */}
        <div
          aria-hidden="true"
          className="absolute top-5 right-6 text-xs font-doodle text-[#B3835B]/60 select-none"
        >
          ~ sparks &amp; ink
        </div>

        {/* Emblem */}
        <div className="w-20 h-20 mx-auto rounded-full bg-[#27211C] border border-[#B3835B]/30 flex items-center justify-center text-3xl mb-6 shadow-inner">
          🕯️
        </div>

        {/* Title & Atmosphere */}
        <span className="text-xs uppercase tracking-widest text-[#B3835B] font-semibold">
          Chamber of Sparks
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-[#EAE6DF] mt-2 mb-4 font-medium">
          The Little Attic
        </h1>
        <p className="text-[#9D978C] text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-6 font-sans">
          “A wooden writing desk for fleeting ideas, questions that linger, random inspirations, and research notes tucked safely into drawers.”
        </p>

        {/* Quiet Placeholder State */}
        <div className="py-6 px-4 bg-[#14161C] border border-[#252A34] rounded-2xl max-w-md mx-auto mb-8 text-xs text-[#9D978C]">
          <p className="font-serif italic text-sm text-[#B3835B] mb-1">
            Fresh parchment leaves are waiting.
          </p>
          <p className="font-sans">
            Note capturing, tags, search, and idea resurfacing will arrive in Phase 2.
          </p>
        </div>

        {/* Return to Living Room */}
        <ReturnButton />
      </div>
    </main>
  );
}
