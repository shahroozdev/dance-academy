"use client";

import { cloneElement, useState, type ReactElement, type ReactNode } from "react";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type ModalRenderProps = { close: () => void };

type ModalProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  trigger?: ReactElement;
  closeOnOutsideClick?: boolean;
  className?: string;
  children: ((props: ModalRenderProps) => ReactNode) | ReactElement<Partial<ModalRenderProps>>;
};

export function Modal({
  open,
  defaultOpen = false,
  onOpenChange,
  disabled = false,
  trigger,
  closeOnOutsideClick = true,
  className,
  children,
}: ModalProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const uncontrolledOrControlledOpen = isControlled ? open : internalOpen;
  const resolvedOpen = disabled ? false : uncontrolledOrControlledOpen;

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const close = () => handleOpenChange(false);

  const preventOutsideDismiss = (event: Event) => event.preventDefault();

  return (
    <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={className}
        onPointerDownOutside={closeOnOutsideClick ? undefined : preventOutsideDismiss}
        onEscapeKeyDown={closeOnOutsideClick ? undefined : preventOutsideDismiss}
      >
        {typeof children === "function" ? children({ close }) : cloneElement(children, { close })}
      </DialogContent>
    </Dialog>
  );
}
