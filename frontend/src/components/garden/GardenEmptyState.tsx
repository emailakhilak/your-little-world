"use client";

interface GardenEmptyStateProps {
  filterStatus?: string;
  onPlantSeed: () => void;
}

export default function GardenEmptyState({
  onPlantSeed,
}: GardenEmptyStateProps) {
  return (
    <div className="py-10 text-center font-doodle select-none">
      <p className="text-xs text-[#77777D] mb-2">
        ~ no intentions written in this rhythm yet ~
      </p>
      <button
        type="button"
        onClick={onPlantSeed}
        className="text-xs text-[#A1A1AA] hover:text-[#FFFFFF] underline underline-offset-4 cursor-pointer transition-colors"
      >
        (+) write one now
      </button>
    </div>
  );
}
