"use client";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0C10]/80 backdrop-blur-xs"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
    >
      <div
        className="w-full max-w-sm bg-[#181B22] border border-[#3E2525] rounded-3xl p-6 shadow-2xl relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-10 rounded-full bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-lg mb-3">
          🗑️
        </div>

        <h3
          id="delete-dialog-title"
          className="font-serif text-lg text-[#EAE6DF] font-medium mb-1"
        >
          Pull this seed from the soil?
        </h3>
        <p id="delete-dialog-desc" className="text-xs text-[#9D978C] font-sans leading-relaxed mb-5">
          Are you sure you want to remove{" "}
          <strong className="text-[#EAE6DF] font-medium font-serif">
            &ldquo;{goalTitle}&rdquo;
          </strong>
          ? This will permanently delete this intention from your garden.
        </p>

        <div className="flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3.5 py-1.5 rounded-xl border border-[#2B303C] bg-[#14161C] text-xs text-[#9D978C] hover:text-[#EAE6DF] transition-colors cursor-pointer"
          >
            Keep Seed
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-1.5 rounded-xl bg-rose-950/80 border border-rose-700/80 text-xs font-medium text-rose-200 hover:bg-rose-900 transition-all cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? "Pulling..." : "Pull Seed"}
          </button>
        </div>
      </div>
    </div>
  );
}
