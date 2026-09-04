"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Settings, Upload, Palette, Type } from "lucide-react";

import { FORM, FormFeilds } from "@/components/common/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card";
import { Button } from "@/components/common/button";
import { PageHeader } from "@/components/shared/page-header";
import { useQuery } from "@/hooks/useQuery";
import { useMutate } from "@/hooks/useMutate";
import { studioSettingsSchema, type StudioSettingsInput } from "@/actions/settings.schema";
import type { StudioSettingsData } from "@/actions/settings";

const FONT_SIZE_OPTIONS = [
  { label: "Small (14px)", value: "SMALL" },
  { label: "Medium (16px)", value: "MEDIUM" },
  { label: "Large (18px)", value: "LARGE" },
];

function ColorField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={name} className="text-sm font-medium min-w-[120px]">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
        />
      </div>
      <span className="text-sm text-muted-foreground font-mono">{value}</span>
    </div>
  );
}

function AppearanceForm({ settings }: { settings: StudioSettingsData }) {
  const { mutate: updateSettings, isLoading } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  return (
    <FORM
      schema={studioSettingsSchema}
      defaultValues={{
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        fontSize: settings.fontSize,
        studioName: settings.studioName,
      }}
      onSubmit={(data) => {
        updateSettings(data);
      }}
      className="flex flex-col gap-6"
    >
      {(form) => (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                Theme Colors
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-1">
                <FormFeilds<StudioSettingsInput>
                  name="primaryColor"
                  label="Primary Color"
                  type="text"
                  placeholder="#9B1B5E"
                />
                <FormFeilds<StudioSettingsInput>
                  name="secondaryColor"
                  label="Secondary Color"
                  type="text"
                  placeholder="#F5D0E0"
                />
                <FormFeilds<StudioSettingsInput>
                  name="accentColor"
                  label="Accent Color"
                  type="text"
                  placeholder="#E8A0D0"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter hex color codes (e.g. #9B1B5E). Changes apply instantly across the app.
              </p>
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
              <FormFeilds<StudioSettingsInput>
                name="fontSize"
                label="Base Font Size"
                type="select"
                options={FONT_SIZE_OPTIONS}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
              {isLoading ? "Saving..." : "Save Appearance"}
            </Button>
          </div>
        </>
      )}
    </FORM>
  );
}

function BrandingForm({ settings }: { settings: StudioSettingsData }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(settings.logoUrl);
  const [uploading, setUploading] = useState(false);

  const { mutate: updateSettings, isLoading: isSavingName } = useMutate("updateStudioSettings", {
    invalidateKeys: ["getStudioSettings"],
  });

  const { mutate: uploadLogo, isLoading: isUploading } = useMutate("uploadLogo", {
    invalidateKeys: ["getStudioSettings"],
  });

  const isLoading = isSavingName || isUploading;

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
            schema={studioSettingsSchema}
            defaultValues={{
              primaryColor: settings.primaryColor,
              secondaryColor: settings.secondaryColor,
              accentColor: settings.accentColor,
              fontSize: settings.fontSize,
              studioName: settings.studioName,
            }}
            onSubmit={(data) => {
              updateSettings({ studioName: data.studioName });
            }}
          >
            {(form) => (
              <>
                <FormFeilds<StudioSettingsInput>
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

export function SettingsClient({ initialSettings }: { initialSettings: StudioSettingsData }) {
  const { data: settings } = useQuery("getStudioSettings", [], {
    initialData: initialSettings,
  });

  if (!settings) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" subtitle="Customize the look and feel of your studio app." />
      <AppearanceForm settings={settings} />
      <BrandingForm settings={settings} />
    </div>
  );
}
