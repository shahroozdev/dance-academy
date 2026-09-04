import {
  Card as CardPrimitive,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { ReactNode } from "react";

export {
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

interface CardWrapperProps {
  header?: ReactNode;
  headerClassName?: string;
  footer?: ReactNode;
  footerClassName?: string;
  children?: ReactNode;
  contentClassName?: string;
  className?: string;
}

export function Card({
  header,
  headerClassName,
  footer,
  footerClassName,
  children,
  contentClassName,
  className, 
}: CardWrapperProps) {
  return (
    <CardPrimitive className={className}>
      {header ? <CardHeader className={cn("pb-2!",headerClassName)}>{header}</CardHeader> : null}
      <CardContent className={contentClassName}>{children}</CardContent>
      {footer ? <CardFooter className={footerClassName}>{footer}</CardFooter> : null}
    </CardPrimitive>
  );
}
