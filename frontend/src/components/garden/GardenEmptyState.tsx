"use client";

interface GardenEmptyStateProps {
  filterStatus: "all" | "active" | "completed" | "archived";
  onPlantSeed: () => void;
}

export default function GardenEmptyState({
  filterStatus,
  onPlantSeed,
}: GardenEmptyStateProps) {
  let title = "The soil is quiet and waiting";
  let description =
    "Plant your first seed of intention — a daily rhythm, quiet habit, or long-term dream you wish to nurture into bloom.";
  let badge = "✦ plot is resting";

  if (filterStatus === "active") {
    title = "No active sprouts right now";
    description =
      "All your current intentions have bloomed or are resting in the soil. Plant a new seed when you are ready.";
    badge = "✦ all nurtured";
  } else if (filterStatus === "completed") {
    title = "No blossoms yet";
    description =
      "As you mark your intentions finished, their blossoms will gather here like pressed flowers in a garden journal.";
    badge = "✦ awaiting bloom";
  } else if (filterStatus === "archived") {
    title = "The compost bed is clear";
    description =
      "Resting or completed goals you have archived will be preserved here peacefully.";
    badge = "✦ tranquil soil";
  }

  return (
    <div
      className="w-full bg-[#181B22]/90 border border-[#272C38] rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center my-6 relative overflow-hidden transition-all duration-300"
      role="status"
      aria-live="polite"
    >
      {/* Subtle top corner doodle */}
      <span
        aria-hidden="true"
        className="absolute top-4 right-5 text-xs font-doodle text-[#86A868]/50 select-none"
      >
        {badge}
      </span>

      {/* Hand-drawn Soil & Seedling SVG Emblem */}
      <div className="w-20 h-20 mb-5 relative flex items-center justify-center">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground soil line with wavy doodle feel */}
          <path
            d="M15 75 Q30 71 50 74 T85 73"
            stroke="#5C4838"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Earth soil mound */}
          <ellipse cx="50" cy="76" rx="28" ry="7" fill="#2E2018" />
          {/* Tiny resting seed */}
          <ellipse cx="50" cy="74" rx="5" ry="3.5" fill="#B3835B" stroke="#66462C" strokeWidth="1" />
          {/* Gentle budding sprout line */}
          <path
            d="M50 73 C49 60 48 52 50 44"
            stroke="#6E9433"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Left curved leaf */}
          <path
            d="M50 56 C42 54 36 58 35 63 C41 65 48 61 50 56 Z"
            fill="#7A9E3C"
            stroke="#4A6620"
            strokeWidth="1.2"
          />
          {/* Right upper leaf */}
          <path
            d="M50 48 C58 45 66 48 68 53 C62 56 54 53 50 48 Z"
            fill="#8BB145"
            stroke="#4A6620"
            strokeWidth="1.2"
          />
          {/* Tiny sparkle over sprout */}
          <path
            d="M50 34 L51 38 L55 39 L51 40 L50 44 L49 40 L45 39 L49 38 Z"
            fill="#E5B458"
            opacity="0.8"
          />
        </svg>
      </div>

      <h3 className="font-serif text-xl sm:text-2xl text-[#EAE6DF] font-medium mb-2">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-[#9D978C] max-w-md mx-auto leading-relaxed mb-6 font-sans">
        {description}
      </p>

      {/* Call to action */}
      {filterStatus !== "archived" && (
        <button
          onClick={onPlantSeed}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#202722] border border-[#86A868]/50 text-[#CDE6B5] hover:bg-[#28332A] hover:border-[#86A868] transition-all duration-200 shadow-sm text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86A868] cursor-pointer"
        >
          <span aria-hidden="true" className="text-base font-doodle">
            ✦
          </span>
          <span className="font-serif">Plant a New Seed</span>
        </button>
      )}
    </div>
  );
}
