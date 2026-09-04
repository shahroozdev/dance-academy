"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { done, subscribe } from "@/lib/route-progress";

function RouteChangeListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    done();
    // Re-run whenever the rendered route changes so the bar clears once the
    // new page has actually painted, not just when navigation was requested.
  }, [pathname, searchParams]);

  return null;
}

export function RouteProgressBar() {
  const [active, setActive] = useState(false);

  useEffect(() => subscribe(setActive), []);

  return (
    <>
      <Suspense fallback={null}>
        <RouteChangeListener />
      </Suspense>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-transparent"
      >
        <div
          className={`h-full bg-primary transition-all duration-300 ease-out ${
            active ? "w-2/3 opacity-100" : "w-0 opacity-0"
          }`}
        />
      </div>
    </>
  );
}
