"use client";

import NextLink, { type LinkProps as NextLinkProps } from "next/link";
import { type AnchorHTMLAttributes, forwardRef } from "react";

import { start } from "@/lib/route-progress";

type LinkProps = NextLinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps> & {
    children?: React.ReactNode;
  };

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { onClick, ...props },
  ref,
) {
  return (
    <NextLink
      ref={ref}
      onClick={(event) => {
        start();
        onClick?.(event);
      }}
      {...props}
    />
  );
});
