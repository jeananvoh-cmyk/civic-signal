import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
    "text-[11px] font-semibold tracking-[0.01em] leading-none",
    "transition-colors whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary/15 text-primary",
        solid:       "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/12 text-destructive border-destructive/20",
        outline:     "border-border text-foreground bg-transparent",
        success:     "border-transparent bg-green-500/12 text-green-700 dark:text-green-400 border-green-500/20",
        warning:     "border-transparent bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/20",
        info:        "border-transparent bg-blue-500/12 text-blue-700 dark:text-blue-400 border-blue-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
