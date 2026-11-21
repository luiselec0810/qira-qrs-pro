import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] text-white shadow-[0_10px_24px_-8px_rgba(37,99,235,0.75)] ring-1 ring-sky-300/25 hover:from-[#60a5fa] hover:to-[#2563eb]",
        destructive:
          "bg-destructive/90 text-white shadow-xs ring-1 ring-red-400/30 hover:bg-destructive",
        outline:
          "border border-sky-400/20 bg-[#0f1b30]/90 text-foreground shadow-xs hover:border-sky-400/45 hover:bg-[#152540] hover:text-foreground",
        secondary:
          "bg-[#13223b] text-secondary-foreground shadow-xs ring-1 ring-sky-400/12 hover:bg-[#1a2e4f]",
        ghost: "text-muted-foreground hover:bg-sky-400/[0.08] hover:text-foreground",
        link: "text-sky-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-xl px-3 text-xs",
        lg: "h-10 rounded-2xl px-6",
        icon: "size-9 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { buttonVariants };
