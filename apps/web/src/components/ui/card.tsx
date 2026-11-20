import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "surface-card rounded-3xl border border-white/[0.08] bg-card text-card-foreground transition-colors",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-6 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-semibold tracking-tight leading-none text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

const badgeTones = {
  default: "bg-primary/15 text-[#f7995c] ring-1 ring-primary/30",
  success: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-400/30",
  warning: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30",
  destructive: "bg-destructive/15 text-red-400 ring-1 ring-red-400/30",
  muted: "bg-white/[0.06] text-muted-foreground ring-1 ring-white/[0.08]",
} as const;

export function Badge({
  className,
  tone = "default",
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Separator({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  return (
    <div
      role="separator"
      className={cn("shrink-0 bg-white/[0.08]", vertical ? "h-full w-px" : "h-px w-full", className)}
    />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.06] bg-gradient-to-r from-[#17110d]/90 via-[#1b1410]/85 to-[#14100d]/90 px-6 py-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}
