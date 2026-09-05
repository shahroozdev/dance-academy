"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Upload,
  Palette,
  Type,
  Percent,
  Mail,
  MessageCircle,
  CalendarClock,
  Paintbrush,
  Wallet,
  Plug,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import type { StudioSettingsData } from "@/actions/settings";
import {
  businessProfileSchema,
  discountSettingsSchema,
  reminderSettingsSchema,
  smtpSettingsSchema,
  whatsappSettingsSchema,
  type BusinessProfileInput,
  type DiscountSettingsInput,
  type ReminderSettingsInput,
  type SmtpSettingsInput,
  type WhatsappSettingsInput,
} from "@/actions/settings.schema";
import { Button } from "@/components/common/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { PageHeader } from "@/components/shared/page-header";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

const FONT_SIZE_OPTIONS = [
  { label: "Small (14px)", value: "SMALL" },
  { label: "Medium (16px)", value: "MEDIUM" },
  { label: "Large (18px)", value: "LARGE" },
];

// A fixed set of curated color themes — replaces free-form hex entry so every combination the
// studio can pick actually looks good together (§ nothing in the requirements doc needs
// per-channel hex control, just "change the look").
const THEME_PRESETS = [
  { key: "malhaar-pink", label: "Malhaar Pink", primaryColor: "#9B1B5E", secondaryColor: "#F5D0E0", accentColor: "#E8A0D0" },
  { key: "royal-purple", label: "Royal Purple", primaryColor: "#6D28D9", secondaryColor: "#EDE4FB", accentColor: "#C4B5FD" },
  { key: "ocean-blue", label: "Ocean Blue", primaryColor: "#1D4ED8", secondaryColor: "#DBEAFE", accentColor: "#93C5FD" },
  { key: "emerald-green", label: "Emerald Green", primaryColor: "#047857", secondaryColor: "#D1FAE5", accentColor: "#6EE7B7" },
  { key: "sunset-orange", label: "Sunset Orange", primaryColor: "#C2410C", secondaryColor: "#FFE4CC", accentColor: "#FDBA74" },
  { key: "crimson-red", label: "Crimson Red", primaryColor: "#B91C1C", secondaryColor: "#FEE2E2", accentColor: "#FCA5A5" },
  { key: "slate-gray", label: "Slate Gray", primaryColor: "#334155", secondaryColor: "#E2E8F0", accentColor: "#94A3B8" },
] as const;

const THEME_PRESET_KEYS = THEME_PRESETS.map((p) => p.key) as [string, ...string[]];

function findThemePresetKey(settings: StudioSettingsData): string {
  const match = THEME_PRESETS.find(
    (p) =>
      p.primaryColor.toLowerCase() === settings.primaryColor.toLowerCase() &&
      p.secondaryColor.toLowerCase() === settings.secondaryColor.toLowerCase() &&
      p.accentColor.toLowerCase() === settings.accentColor.toLowerCase(),
  );
  return match?.key ?? THEME_PRESETS[0].key;
}

function ThemeSwatch({ preset }: { preset: (typeof THEME_PRESETS)[number] }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex overflow-hidden rounded-full border border-border/50">
        {[preset.primaryColor, preset.secondaryColor, preset.accentColor].map((color, i) => (
          <span key={i} className="size-3.5" style={{ backgroundColor: color }} />
        ))}
      </span>
      {preset.label}
    </span>
  );
}

const appearanceFormSchema = z.object({
  themePreset: z.enum(THEME_PRESET_KEYS),
  fontSize: z.enum(["SMALL", "MEDIUM", "LARGE"]),
});
type AppearanceFormInput = z.infer<typeof appearanceFormSchema>;

function AppearanceForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  const form = useForm<AppearanceFormInput>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: { themePreset: findThemePresetKey(settings), fontSize: settings.fontSize },
  });

  const onSubmit = form.handleSubmit((data) => {
    const preset = THEME_PRESETS.find((p) => p.key === data.themePreset) ?? THEME_PRESETS[0];
    updateSettings({
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      fontSize: data.fontSize,
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="themePreset"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Choose a theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESETS.map((preset) => (
                    <SelectItem key={preset.key} value={preset.key}>
                      <ThemeSwatch preset={preset} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">Applies instantly across the app once saved.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4" />
            Font Size
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            control={form.control}
            name="fontSize"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full sm:w-72">
                  <SelectValue placeholder="Choose a font size" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
          {isLoading ? "Saving..." : "Save Appearance"}
        </Button>
      </div>
    </form>
  );
}

function BrandingForm({ settings }: { settings: StudioSettingsData }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(settings.logoUrl);
  const [uploading, setUploading] = useState(false);

  const { mutate: updateSettings, isLoading: isSavingName } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  const { mutate: uploadLogo } = useMutate("uploadLogo", {
    invalidateKeys: ["getStudioSettings"],
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("logo", file);

    try {
      await uploadLogo(formData);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="h-4 w-4" />
            Studio Logo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center overflow-hidden">
              {preview ? (
                <Image
                  src={preview}
                  alt="Studio logo"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              ) : (
                <Palette className="h-8 w-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPEG, WebP, or SVG. Max 5 MB.
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Studio Name</CardTitle>
        </CardHeader>
        <CardContent>
          <FORM
            schema={businessProfileSchema}
            defaultValues={{ studioName: settings.studioName ?? "Malhaar Dance Company" }}
            onSubmit={(data) => {
              updateSettings(data);
            }}
          >
            {(form) => (
              <>
                <FormFeilds<BusinessProfileInput>
                  name="studioName"
                  label="Studio Name"
                  type="text"
                  placeholder="Malhaar Dance Company"
                />
                <div className="flex justify-end mt-4">
                  <Button type="submit" disabled={isSavingName || !form.formState.isDirty}>
                    {isSavingName ? "Saving..." : "Save Name"}
                  </Button>
                </div>
              </>
            )}
          </FORM>
        </CardContent>
      </Card>
    </div>
  );
}

function DiscountForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={discountSettingsSchema}
      defaultValues={{
        multiClassDiscountPct: settings.multiClassDiscountPct,
        siblingDiscountPct: settings.siblingDiscountPct,
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-4 w-4" />
              Discount Policy
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<DiscountSettingsInput>
                name="multiClassDiscountPct"
                label="Multi-Class Discount"
                type="number"
                placeholder="0.05"
              />
              <FormFeilds<DiscountSettingsInput>
                name="siblingDiscountPct"
                label="Sibling Discount"
                type="number"
                placeholder="0.05"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter as a decimal fraction of tuition, e.g. 0.05 for 5%. Applied automatically when
              generating monthly billing.
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Discount Policy"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}

function ReminderForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={reminderSettingsSchema}
      defaultValues={{
        dueDayOfMonth: settings.dueDayOfMonth,
        paymentReminderDaysAfterDue: settings.paymentReminderDaysAfterDue,
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" />
              Due Date & Payment Reminders
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<ReminderSettingsInput>
                name="dueDayOfMonth"
                label="Due Day of Month"
                type="number"
                placeholder="5"
              />
              <FormFeilds<ReminderSettingsInput>
                name="paymentReminderDaysAfterDue"
                label="Reminder Days After Due"
                type="number"
                placeholder="7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A bill for a given month is due on this day of that month. A daily scheduled job
              emails a one-time payment reminder to any family still Unpaid/Partial this many days
              after their due date.
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Reminder Settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}

function SmtpForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={smtpSettingsSchema}
      defaultValues={{
        smtpHost: settings.smtpHost ?? "",
        smtpPort: settings.smtpPort ?? 587,
        smtpSecure: settings.smtpSecure,
        smtpUser: settings.smtpUser ?? "",
        smtpPassword: "",
        emailFrom: settings.emailFrom ?? "",
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4" />
              Email (SMTP)
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<SmtpSettingsInput> name="smtpHost" label="SMTP Host" type="text" placeholder="smtp.gmail.com" />
              <FormFeilds<SmtpSettingsInput> name="smtpPort" label="SMTP Port" type="number" placeholder="587" />
              <FormFeilds<SmtpSettingsInput> name="smtpUser" label="SMTP User" type="text" placeholder="you@example.com" />
              <FormFeilds<SmtpSettingsInput>
                name="smtpPassword"
                label="SMTP Password"
                type="password"
                placeholder={settings.smtpPasswordSet ? "Configured — leave blank to keep" : "Enter password"}
              />
              <FormFeilds<SmtpSettingsInput>
                name="emailFrom"
                label="From Address"
                type="text"
                placeholder="Malhaar Dance Company <no-reply@example.com>"
                className="sm:col-span-2"
              />
            </div>
            <Field orientation="horizontal">
              <Switch
                id="smtpSecure"
                checked={form.watch("smtpSecure")}
                onCheckedChange={(checked) => form.setValue("smtpSecure", checked, { shouldDirty: true })}
              />
              <FieldLabel htmlFor="smtpSecure">Use TLS (secure)</FieldLabel>
            </Field>
            <FieldDescription>
              Leave the host blank to disable email sending. Any standard SMTP provider works
              (Gmail app password, Google Workspace, SendGrid, Mailgun, Resend SMTP, etc.).
            </FieldDescription>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Email Settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}

function WhatsappForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={whatsappSettingsSchema}
      defaultValues={{
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId ?? "",
        whatsappBusinessAccountId: settings.whatsappBusinessAccountId ?? "",
        whatsappAccessToken: "",
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
    >
      {(form) => (
        <Card
          header={
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Cloud API
            </CardTitle>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<WhatsappSettingsInput>
                name="whatsappPhoneNumberId"
                label="Phone Number ID"
                type="text"
              />
              <FormFeilds<WhatsappSettingsInput>
                name="whatsappBusinessAccountId"
                label="Business Account ID"
                type="text"
              />
              <FormFeilds<WhatsappSettingsInput>
                name="whatsappAccessToken"
                label="Access Token"
                type="password"
                placeholder={settings.whatsappAccessTokenSet ? "Configured — leave blank to keep" : "Enter access token"}
                className="sm:col-span-2"
              />
            </div>
            <FieldDescription>
              From the Meta developer console (see docs/05-notifications-whatsapp.md). Fee
              reminders currently use a wa.me link and don&apos;t require these — they&apos;re
              here for future automated sending.
            </FieldDescription>
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save WhatsApp Settings"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}

export function SettingsClient({ initialSettings }: { initialSettings: StudioSettingsData }) {
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
      </Tabs>
    </div>
  );
}
