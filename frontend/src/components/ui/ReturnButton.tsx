import Link from "next/link";

interface ReturnButtonProps {
  label?: string;
}

export default function ReturnButton({
  label = "Return to The Living Room",
}: ReturnButtonProps) {
  return (
    <Link
      href="/"
      className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#1E222A] border border-[#2D3340] text-sm text-[#EAE6DF] hover:bg-[#262C38] hover:border-[#3D4556] transition-all duration-200 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B458] focus-visible:ring-offset-2 focus-visible:ring-offset-[#13151A]"
      aria-label="Return to the main living room scene"
    >
      <span aria-hidden="true" className="text-base font-doodle text-[#E5B458]">
        ←
      </span>
      <span className="font-serif font-medium">{label}</span>
    </Link>
  );
}
