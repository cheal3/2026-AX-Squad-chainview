import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";

export function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth = "max-w-4xl",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className={`w-full ${maxWidth} max-h-[90vh] overflow-hidden rounded-lg bg-white shadow-2xl`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-73px)] overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
      />
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#f60]"
      >
        {Object.entries(options).map(([code, labelText]) => (
          <option key={code} value={code}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-gray-900">
        {value}
      </div>
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

export function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export function ActionPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={17} className="text-[#f60]" />
        <h5 className="font-semibold text-gray-900">{title}</h5>
      </div>
      {children}
    </div>
  );
}

export function toOptions(values: string[]) {
  return values.reduce<Record<string, string>>((acc, value) => {
    acc[value] = value;
    return acc;
  }, {});
}
