import type { ButtonHTMLAttributes, ReactNode } from "react";

type TableActionTone = "primary" | "neutral" | "danger" | "solid";

const toneClassName: Record<TableActionTone, string> = {
  primary:
    "border-[#d9e8ff] bg-[#f2f7ff] text-[#1f6feb] hover:border-[#c7dbff] hover:bg-[#e8f2ff]",
  neutral:
    "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200",
  danger:
    "border-[#ffe5e8] bg-[#fff5f6] text-[#f04452] hover:border-[#ffd1d6] hover:bg-[#ffe5e8]",
  solid:
    "border-[#3182f6] bg-[#3182f6] text-white shadow-sm hover:border-[#1b64da] hover:bg-[#1b64da]",
};

export function TableActionButton({
  children,
  className = "",
  tone = "neutral",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: TableActionTone;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 min-w-[56px] shrink-0 items-center justify-center gap-1 whitespace-nowrap break-keep rounded-md border px-2 text-xs font-black leading-none transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClassName[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
