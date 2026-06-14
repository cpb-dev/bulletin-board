"use client";

import { useKeyboardInset } from "@/lib/use-keyboard-inset";

/** Reusable bottom sheet for composers, editors and pickers. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Lift the sheet above the on-screen keyboard (iOS doesn't do this for us).
  const inset = useKeyboardInset();
  return (
    <div
      className="absolute inset-0 z-20 flex items-end sm:items-center justify-center bg-black/35"
      style={{ paddingBottom: inset ? inset : undefined }}
      onClick={onClose}
    >
      <div
        className="cute-panel pop-in w-full sm:max-w-md max-h-[80dvh] overflow-y-auto rounded-b-none sm:rounded-b-[1.25rem] p-5 pb-8 sm:pb-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="hand text-2xl">{title}</h2>
          <button
            className="cute-button ghost !px-3 !py-1.5 text-sm"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Round paper-colour swatch. */
export function Swatch({
  color,
  selected,
  label,
  onSelect,
}: {
  color: string;
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className="h-9 w-9 rounded-full border-4 transition-transform"
      style={{
        background: color,
        borderColor: selected ? "var(--ui-accent)" : "transparent",
        transform: selected ? "scale(1.12)" : undefined,
      }}
    />
  );
}
