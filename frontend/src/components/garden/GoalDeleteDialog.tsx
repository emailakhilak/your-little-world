"use client";

import { DoodleDeleteIcon } from "./GardenDoodles";

interface GoalDeleteDialogProps {
  isOpen: boolean;
  goalTitle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isDeleting: boolean;
}

export default function GoalDeleteDialog({
  isOpen,
  goalTitle,
  onConfirm,
  onCancel,
  isDeleting,
}: GoalDeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/80 backdrop-blur-xs select-text"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
    >
      <div
        className="w-full max-w-sm bg-[#141417] border border-[#2B2B32] rounded-3xl p-6 shadow-2xl relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-9 rounded-full border border-[#3E3E48] flex items-center justify-center text-[#8E8E93] mb-3">
          <DoodleDeleteIcon className="w-4 h-4" />
        </div>

        <h3
          id="delete-dialog-title"
          className="font-serif text-lg text-[#EAE6DF] font-medium mb-1"
        >
          Delete this intention?
        </h3>
        <p
          id="delete-dialog-desc"
          className="text-xs text-[#9D978C] font-doodle leading-relaxed mb-5"
        >
          Are you sure you want to remove{" "}
          <strong className="text-[#EAE6DF] font-medium font-serif">
            &ldquo;{goalTitle}&rdquo;
          </strong>
          ? This cannot be undone.
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
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
