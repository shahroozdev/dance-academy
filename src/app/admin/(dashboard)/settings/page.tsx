import { getEmailTemplates } from "@/actions/email-templates";
import { getStudioSettings } from "@/actions/settings";

import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const [settings, emailTemplates] = await Promise.all([getStudioSettings(), getEmailTemplates()]);

  return <SettingsClient initialSettings={settings} initialEmailTemplates={emailTemplates} />;
}
