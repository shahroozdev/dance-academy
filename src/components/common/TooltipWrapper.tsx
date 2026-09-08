import { cloneElement } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import type { ReactElement } from "react";

interface TooltipWrapperProps {
  label: string;
  children: ReactElement;
  /** Forwarded onto `children` — lets an ancestor's `asChild` (e.g. a Dialog/Popover trigger) reach past this wrapper to the real interactive element. */
  [key: string]: unknown;
}

const TooltipWrapper = ({ label, children, ...rest }: TooltipWrapperProps) => {
  const isDisabled = Boolean((children.props as { disabled?: boolean }).disabled);
  const child = cloneElement(children, rest);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {isDisabled ? (
            <span className="inline-flex" tabIndex={0}>
              {child}
            </span>
          ) : (
            child
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TooltipWrapper;
