"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

const inputClass =
  "h-12 w-full rounded-xl border-2 border-line bg-surface px-4 text-base font-medium text-fg placeholder:font-normal placeholder:text-muted/70 transition-colors hover:border-brand/40 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 aria-invalid:border-danger";

type FieldProps = ComponentProps<"input"> & { label: string; error?: string; hint?: ReactNode };

/** Yorliq + input + xato matni. */
export function Field({ label, error, hint, className, id, ...props }: FieldProps) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-bold text-fg">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-err` : undefined}
        className={cn(inputClass, className)}
        {...props}
      />
      {hint}
      {error && (
        <p id={`${inputId}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Parol maydoni — "ko'rsatish/yashirish" tugmasi bilan. */
export function PasswordField(props: Omit<FieldProps, "type">) {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("auth");
  const auto = useId();
  const inputId = props.id ?? auto;
  const { label, error, hint, className, ...rest } = props;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-bold text-fg">
        {label}
      </label>
      <div className="relative">
        <input
          {...rest}
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          className={cn(inputClass, "pr-12", className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("hidePassword") : t("showPassword")}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted hover:text-fg"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      {hint}
      {error && (
        <p id={`${inputId}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const controlClass =
  "w-full rounded-xl border-2 border-line bg-surface px-4 text-base font-medium text-fg transition-colors hover:border-brand/40 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

export function Select({ label, className, children, id, ...props }: ComponentProps<"select"> & { label?: string }) {
  const auto = useId();
  const selectId = id ?? auto;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-bold text-fg">
          {label}
        </label>
      )}
      <select id={selectId} className={cn(controlClass, "h-12", className)} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, className, id, ...props }: ComponentProps<"textarea"> & { label: string }) {
  const auto = useId();
  const areaId = id ?? auto;
  return (
    <div className="space-y-1.5">
      <label htmlFor={areaId} className="block text-sm font-bold text-fg">
        {label}
      </label>
      <textarea id={areaId} className={cn(controlClass, "min-h-28 py-3", className)} {...props} />
    </div>
  );
}
