"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
}: {
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "paper fixed left-1/2 top-1/2 z-50 w-[min(560px,94vw)] max-h-[92vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto",
          "rounded-lg border-hair border-border-strong bg-cream shadow-lg focus:outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95",
          className,
        )}
      >
        {/* Remate superior salvia→arcilla */}
        <div className="h-1 w-full bg-gradient-to-r from-sage to-clay" />
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between border-b border-border-soft pb-3">
            <DialogPrimitive.Title className="font-display text-h4 font-normal text-sage">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-sm p-1 text-ink-muted transition-colors hover:bg-beige-warm hover:text-sage">
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
