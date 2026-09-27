"use client";

interface GoalProgressRibbonProps {
  activeCount: number;
  completedCount: number;
  archivedCount: number;
  totalCount: number;
  selectedStatus: "all" | "active" | "completed" | "archived";
  onSelectStatus: (status: "all" | "active" | "completed" | "archived") => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onPlantSeed: () => void;
}

const CATEGORIES = [
  { id: "all", label: "All Types" },
  { id: "seedling", label: "🌱 Seedlings" },
  { id: "habit", label: "🌿 Habits" },
  { id: "milestone", label: "🌸 Milestones" },
  { id: "aspiration", label: "🌳 Aspirations" },
];

export default function GoalProgressRibbon({
  activeCount,
  completedCount,
  archivedCount,
  totalCount,
  selectedStatus,
  onSelectStatus,
  selectedCategory,
  onSelectCategory,
  onPlantSeed,
}: GoalProgressRibbonProps) {
  // Calculate completion percentage based on active + completed (excluding archived)
  const activePlusCompleted = activeCount + completedCount;
  const bloomPercentage =
    activePlusCompleted > 0
      ? Math.round((completedCount / activePlusCompleted) * 100)
      : 0;

  return (
    <div className="w-full bg-[#181B22] border border-[#272C38] rounded-2xl p-4 sm:p-6 mb-6 shadow-sm">
      {/* Top row: Atmosphere summary & Plant button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-[#252A34]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-widest text-[#86A868] font-semibold">
              Plot Vitals
            </span>
            <span className="text-[#4E5666] text-xs">•</span>
            <span className="text-xs text-[#9D978C] font-serif italic">
              {bloomPercentage}% in bloom
            </span>
          </div>
          <div className="flex items-center space-x-4 mt-1 text-sm">
            <span className="inline-flex items-center space-x-1.5 text-[#EAE6DF]">
              <span className="text-[#86A868]">🌱</span>
              <span className="font-medium">{activeCount}</span>
              <span className="text-[#9D978C] text-xs">sprouting</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 text-[#EAE6DF]">
              <span className="text-[#E5B458]">🌸</span>
              <span className="font-medium">{completedCount}</span>
              <span className="text-[#9D978C] text-xs">in bloom</span>
            </span>
            {archivedCount > 0 && (
              <span className="inline-flex items-center space-x-1.5 text-[#EAE6DF]">
                <span className="text-[#B3835B]">🍂</span>
                <span className="font-medium">{archivedCount}</span>
                <span className="text-[#9D978C] text-xs">resting</span>
              </span>
            )}
          </div>
        </div>

        {/* Plant Seed Action */}
        <button
          onClick={onPlantSeed}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#202722] border border-[#86A868]/40 text-[#CDE6B5] hover:bg-[#273229] hover:border-[#86A868] transition-all duration-200 shadow-sm text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86A868] cursor-pointer shrink-0"
        >
          <span aria-hidden="true" className="font-doodle text-base">
            ✦
          </span>
          <span className="font-serif">Plant a Seed</span>
        </button>
      </div>

      {/* Progress Bar with seedling marker */}
      <div className="py-4">
        <div className="flex justify-between items-center text-xs text-[#9D978C] mb-1.5">
          <span className="font-sans">Nurtured Rhythm</span>
          <span className="font-serif italic text-[#86A868]">
            {completedCount} of {activePlusCompleted} intentions bloomed
          </span>
        </div>
        <div className="w-full h-2 bg-[#12141A] rounded-full overflow-hidden border border-[#252A34] relative">
          <div
            className="h-full bg-gradient-to-r from-[#5B7841] via-[#7B9E56] to-[#86A868] transition-all duration-500 rounded-full"
            style={{ width: `${bloomPercentage}%` }}
            role="progressbar"
            aria-valuenow={bloomPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Filter Tabs & Category Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#252A34]">
        {/* Status navigation */}
        <nav
          className="flex items-center space-x-1 bg-[#12141A] p-1 rounded-xl border border-[#222732] overflow-x-auto text-xs"
          aria-label="Filter goals by status"
        >
          <button
            onClick={() => onSelectStatus("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedStatus === "all"
                ? "bg-[#252B36] text-[#EAE6DF] shadow-xs"
                : "text-[#9D978C] hover:text-[#EAE6DF]"
            }`}
          >
            All Intentions ({totalCount})
          </button>
          <button
            onClick={() => onSelectStatus("active")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedStatus === "active"
                ? "bg-[#252B36] text-[#CDE6B5] shadow-xs"
                : "text-[#9D978C] hover:text-[#CDE6B5]"
            }`}
          >
            🌱 Sprouting ({activeCount})
          </button>
          <button
            onClick={() => onSelectStatus("completed")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedStatus === "completed"
                ? "bg-[#252B36] text-[#F3D797] shadow-xs"
                : "text-[#9D978C] hover:text-[#F3D797]"
            }`}
          >
            🌸 In Bloom ({completedCount})
          </button>
          <button
            onClick={() => onSelectStatus("archived")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer shrink-0 ${
              selectedStatus === "archived"
                ? "bg-[#252B36] text-[#D4AA85] shadow-xs"
                : "text-[#9D978C] hover:text-[#D4AA85]"
            }`}
          >
            🍂 Resting ({archivedCount})
          </button>
        </nav>

        {/* Category Filter Chips / Select */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <span className="text-[#9D978C] mr-1 hidden md:inline font-doodle text-sm">
            filter:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-[#202722] border-[#86A868]/60 text-[#CDE6B5]"
                  : "bg-[#14161C] border-[#252A34] text-[#9D978C] hover:text-[#EAE6DF] hover:border-[#353C4A]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
