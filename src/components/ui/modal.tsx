"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Alert } from "./alert";
import { Button } from "./button";

/** Brauzerning o'z <dialog> elementi asosidagi modal oyna (Esc bilan yopiladi, fokusni ushlab turadi). */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Yopish" className="-m-1.5 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg">
              <X className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/**
 * Xavfli amal oldidan tasdiq so'raydigan tugma.
 * `trigger` — bosiladigan tugma ichidagi matn/ikonka.
 */
export function ConfirmButton({
  trigger, title, text, confirmLabel, onConfirm, pending, error, variant = "danger", triggerVariant = "outline", size = "sm", className,
}: {
  trigger: ReactNode;
  title: string;
  text?: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  error?: string | null;
  variant?: "danger" | "primary";
  triggerVariant?: "outline" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Amal xatosiz tugagach oyna o'zi yopiladi
  if (submitted && !pending && !error) {
    setSubmitted(false);
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant={triggerVariant} size={size} className={className} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Modal open={open} onClose={() => { setOpen(false); setSubmitted(false); }} title={title}>
        {text && <p className="text-sm text-muted">{text}</p>}
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Bekor qilish
          </Button>
          <Button type="button" variant={variant} size="sm" disabled={pending} onClick={() => { setSubmitted(true); onConfirm(); }}>
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
