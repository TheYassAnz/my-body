"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

/** Bottom sheet on mobile, centred 440 px modal on desktop (specs/06 §3). Radix traps and restores focus. */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(10,10,10,.35)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-[22px] bg-bg px-[22px] pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,.12)] lg:inset-x-auto lg:top-1/2 lg:bottom-auto lg:left-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:p-6"
        >
          <div aria-hidden className="mx-auto mb-4 h-[5px] w-10 rounded-full bg-line lg:hidden" />
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-[15px] font-semibold tracking-tight">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fermer"
              className="-mr-2 flex size-11 items-center justify-center rounded-full text-fg-2"
            >
              <X size={20} strokeWidth={1.7} aria-hidden />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
