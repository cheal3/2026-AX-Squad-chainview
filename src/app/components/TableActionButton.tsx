import type { ButtonHTMLAttributes, ReactNode } from "react";

type TableActionTone = "primary" | "neutral" | "danger" | "solid";

const toneClassName: Record<TableActionTone, string> = {
  primary:
    "border-indigo-100 bg-indigo-50 text-indigo-600 hover:border-indigo-200 hover:bg-indigo-100",
  neutral:
    "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200",
  danger:
    "border-red-100 bg-red-50 text-red-600 hover:border-red-200 hover:bg-red-100",
  solid:
    "border-indigo-600 bg-indigo-600 text-white shadow-sm hover:border-indigo-700 hover:bg-indigo-700",
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
