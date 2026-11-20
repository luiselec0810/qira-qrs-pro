import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full min-w-0 rounded-xl border border-white/[0.1] bg-[#120e0b]/90 px-3.5 text-sm text-foreground shadow-inner outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        fieldBase,
        "h-9 py-1 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldBase, "min-h-20 py-2", className)} {...props} />;
}

/** Styled native <select>: accessible, zero-JS, good enough for dashboard forms. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select className={cn(fieldBase, "h-9 py-1 pr-8 [&>option]:bg-[#18120e] [&>option]:text-foreground", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("flex items-center gap-2 text-sm font-medium leading-none select-none text-foreground/90", className)} {...props} />;
}

/** Label + control + optional hint/error, stacked. */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
