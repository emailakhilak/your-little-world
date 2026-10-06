"use client";

import { DoodleDeleteIcon } from "./GardenDoodles";

interface BulkGoalDeleteDialogProps {
  isOpen: boolean;
  count: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

export default function BulkGoalDeleteDialog({
  isOpen,
  count,
  onConfirm,
  onCancel,
  isDeleting,
}: BulkGoalDeleteDialogProps) {
  if (!isOpen) return null;

  const countLabel = count === 1 ? "1 intention" : `${count} intentions`;
  const buttonLabel = count === 1 ? "Delete 1 Intention" : `Delete ${count} Intentions`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/80 backdrop-blur-xs select-text"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bulk-delete-dialog-title"
      aria-describedby="bulk-delete-dialog-desc"
    >
      <div
        className="w-full max-w-sm bg-[#141417] border border-[#2B2B32] rounded-3xl p-6 shadow-2xl relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-9 rounded-full border border-[#3E3E48] flex items-center justify-center text-[#8E8E93] mb-3">
          <DoodleDeleteIcon className="w-4 h-4" />
        </div>

        <h3
          id="bulk-delete-dialog-title"
          className="font-serif text-lg text-[#EAE6DF] font-medium mb-1"
        >
          Delete {countLabel}?
        </h3>
        <p
          id="bulk-delete-dialog-desc"
          className="text-xs text-[#9D978C] font-doodle leading-relaxed mb-5"
        >
          This will permanently delete the selected intentions.
        </p>

        <div className="flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-1.5 rounded-full border border-[#2B2B32] bg-[#141417] text-xs font-doodle text-[#8E8E93] hover:text-[#EAE6DF] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-1.5 rounded-full border border-red-900/60 bg-red-950/40 text-xs font-doodle text-rose-300 hover:text-rose-100 hover:bg-red-900/60 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
