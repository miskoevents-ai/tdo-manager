import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-sage text-cream border-sage hover:bg-sage-600 shadow-xs hover:shadow-sm",
  secondary: "bg-clay text-cream border-clay hover:bg-clay-600 shadow-xs hover:shadow-sm",
  outline: "bg-transparent text-sage border-border-strong hover:bg-sage-tint hover:border-sage-300",
  ghost: "bg-transparent text-ink border-transparent hover:bg-beige-warm",
  danger: "bg-error text-cream border-error hover:opacity-90 shadow-xs hover:shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-[12px] rounded-sm",
  md: "px-5 py-3 text-[13px] rounded-sm",
  lg: "px-8 py-4 text-small rounded-md",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 border-med font-semibold uppercase tracking-[0.08em] leading-none",
        "transition-all duration-base ease-out active:translate-y-px disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
