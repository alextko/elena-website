"use client";

import { Check } from "lucide-react";

interface OptionButtonProps {
  label: string;
  sublabel?: string;
  selected: boolean;
  onClick: () => void;
}

export function OptionButton({ label, sublabel, selected, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-5 py-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-3 font-[family-name:var(--font-inter)] ${
        selected
          ? "bg-[#0F1B3D]/[0.06] border-[#0F1B3D] shadow-[0_0_0_1px_#0F1B3D]"
          : "bg-white border-[#E5E5EA] hover:border-[#0F1B3D]/20 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
      }`}
    >
      <div>
        <div className={`text-[15px] font-medium ${selected ? "text-[#0F1B3D]" : "text-[#1C1C1E]"}`}>{label}</div>
        {sublabel && <div className="text-[13px] text-[#8E8E93] mt-0.5 font-light">{sublabel}</div>}
      </div>
      {selected && (
        <div className="w-6 h-6 rounded-full bg-[#0F1B3D] flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
