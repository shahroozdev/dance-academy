"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useMemo } from "react";

import { start } from "@/lib/route-progress";

export function useRouter() {
  const router = useNextRouter();

  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        start();
        router.push(...args);
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        start();
        router.replace(...args);
      },
      back: () => {
        start();
        router.back();
      },
      forward: () => {
        start();
        router.forward();
      },
    }),
    [router],
  );
}
