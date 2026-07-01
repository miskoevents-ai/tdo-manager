import * as React from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "sage" | "clay" | "ok" | "warn" | "error" | "neutral";

const tones: Record<BadgeTone, string> = {
  sage: "bg-sage-tint text-sage border-sage-tint-deep",
  clay: "bg-clay-tint text-clay-600 border-clay-tint-deep",
  ok: "bg-ok-tint text-ok border-ok-tint",
  warn: "bg-warn-tint text-warn border-warn-tint",
  error: "bg-error-tint text-error border-error-tint",
  neutral: "bg-beige-warm text-ink-secondary border-border",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-block rounded-pill border-hair px-[10px] py-1 text-[10px] font-semibold uppercase tracking-[0.07em] leading-tight",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
