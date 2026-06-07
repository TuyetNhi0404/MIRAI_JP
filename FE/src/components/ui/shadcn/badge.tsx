import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-1",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
        secondary: "border-transparent bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
        destructive: "border-transparent bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]",
        outline: "text-[var(--color-foreground)] border-[var(--color-border)]",
        success: "border-transparent bg-[#F6FFED] text-[#389E0D]",
        warning: "border-transparent bg-[#FFFBE6] text-[#D48806]",
        info: "border-transparent bg-[#E6F4FF] text-[#0958D9]",
        soft: "border-transparent bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
        muted: "border-transparent bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
