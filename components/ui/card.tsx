import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "paper rounded-lg border-hair border-border bg-white p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "mb-3 flex items-baseline justify-between font-display text-[18px] font-normal",
        className,
      )}
      {...props}
    />
  );
}

export function Overline({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-overline font-semibold uppercase tracking-overline text-sage",
        className,
      )}
      {...props}
    />
  );
}
