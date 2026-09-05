"use client";

import { Paintbrush, Wallet, Plug, FileText } from "lucide-react";

import type { EmailTemplateData } from "@/actions/email-templates";
import type { StudioSettingsData } from "@/actions/settings";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@/hooks/useQuery";

import { AppearanceForm, BrandingForm } from "./settings-appearance";
import { DiscountForm, ReminderForm } from "./settings-billing";
import { EmailTemplatesTab } from "./settings-email-templates";
import { SmtpForm, WhatsappForm } from "./settings-integrations";

export function SettingsClient({
  initialSettings,
  initialEmailTemplates,
}: {
  initialSettings: StudioSettingsData;
  initialEmailTemplates: EmailTemplateData[];
}) {
  const { data: settings } = useQuery("getStudioSettings", [], {
    initialData: initialSettings,
  });

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Customize the look and feel of your studio app." />
      <Tabs defaultValue="appearance">
        <TabsList>
          <TabsTrigger value="appearance">
            <Paintbrush className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="billing">
            <Wallet className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="emails">
            <FileText className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
        </TabsList>
        <TabsContent value="appearance" className="flex flex-col gap-6 pt-4">
          <AppearanceForm settings={settings} />
          <BrandingForm settings={settings} />
        </TabsContent>
        <TabsContent value="billing" className="flex flex-col gap-6 pt-4">
          <DiscountForm settings={settings} />
          <ReminderForm settings={settings} />
        </TabsContent>
        <TabsContent value="integrations" className="flex flex-col gap-6 pt-4">
          <SmtpForm settings={settings} />
          <WhatsappForm settings={settings} />
        </TabsContent>
        <TabsContent value="emails" className="flex flex-col gap-6 pt-4">
          <EmailTemplatesTab initialTemplates={initialEmailTemplates} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
