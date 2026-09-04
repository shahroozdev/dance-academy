import { getStudioSettings } from "@/actions/settings";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const settings = await getStudioSettings();

  return <SettingsClient initialSettings={settings} />;
}
