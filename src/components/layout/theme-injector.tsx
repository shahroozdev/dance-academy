"use client";

import { useEffect } from "react";

import type { StudioSettingsData } from "@/actions/settings";
import { useQuery } from "@/hooks/useQuery";

const FONT_SIZE_MAP: Record<"SMALL" | "MEDIUM" | "LARGE", string> = {
  SMALL: "14px",
  MEDIUM: "16px",
  LARGE: "18px",
};

// Reads the same getStudioSettings query cache the Settings page writes through, so saving a
// theme/font-size change there is reflected here immediately (via query-cache-events) instead of
// requiring a full reload — this component stays mounted for the lifetime of the admin layout.
export function ThemeInjector({ initialSettings }: { initialSettings: StudioSettingsData }) {
  const { data: settings } = useQuery("getStudioSettings", [], { initialData: initialSettings });

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", settings.primaryColor);
    root.style.setProperty("--secondary", settings.secondaryColor);
    root.style.setProperty("--accent", settings.accentColor);
    root.style.setProperty("--ring", settings.primaryColor);
    root.style.setProperty("--sidebar-primary", settings.primaryColor);
    root.style.setProperty("--sidebar-ring", settings.primaryColor);
    root.style.setProperty("--font-size-base", FONT_SIZE_MAP[settings.fontSize]);

    return () => {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-ring");
      root.style.removeProperty("--font-size-base");
    };
  }, [settings]);

  return null;
}
