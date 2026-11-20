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
          "bg-gradient-to-b from-[#f48c4c] to-[#db672a] text-white shadow-[0_10px_24px_-8px_rgba(234,122,61,0.7)] ring-1 ring-white/15 hover:from-[#f7985d] hover:to-[#e57133]",
        destructive:
          "bg-destructive/90 text-white shadow-xs ring-1 ring-red-400/30 hover:bg-destructive",
        outline:
          "border border-white/[0.11] bg-[#211813]/90 text-foreground shadow-xs hover:border-primary/40 hover:bg-[#2b1f18] hover:text-foreground",
        secondary:
          "bg-[#2a2019] text-secondary-foreground shadow-xs ring-1 ring-white/[0.08] hover:bg-[#34271f]",
        ghost: "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
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
