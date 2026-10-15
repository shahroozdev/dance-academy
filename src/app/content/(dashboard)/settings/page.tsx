"use client";

import { Settings } from "lucide-react";
import { useMemo } from "react";

import { websiteSettingsSchema, type WebsiteSettingsInput } from "@/actions/content.schema";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { useContentUser } from "@/components/content/content-user-context";
import { EditorNotice, EditorSkeleton, FormFooter, FormSection } from "@/components/content/editor-parts";
import { SiteMediaCard } from "@/components/content/site-media-card";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { HERO_THEME_OPTIONS, HERO_THEME_STYLES } from "@/lib/site-appearance";
import { HERO_PAGE_KEYS, type HeroTheme } from "@/types/site-appearance";
import { cn } from "@/lib/utils";

const HERO_PAGE_LABELS = {
  about: "About",
  training: "Training",
  instructors: "Instructors",
  performances: "Performances",
  festival: "Ananta Festival",
  press: "Press & Media",
  support: "Support",
  contact: "Contact",
} as const;
const HERO_THEME_SELECT_OPTIONS = Object.entries(HERO_THEME_OPTIONS).map(([value, label]) => ({ value, label }));

function renderHeroThemeOption({ label, value }: { label: string; value: string }) {
  const style = HERO_THEME_STYLES[value as HeroTheme];

  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className={cn("h-5 w-12 shrink-0 rounded-md border border-foreground/10 bg-linear-to-br", style.background)} />
      {label}
    </span>
  );
}

export default function WebsiteSettingsPage() {
  const { isOwner } = useContentUser();
  const { data, isLoading } = useQuery("getContentWebsiteSettings", []);
  const { mutate, isLoading: isSaving, error } = useMutate("updateWebsiteSettings", {
    invalidateKeys: ["getContentWebsiteSettings"],
  });
  const defaultValues = useMemo<WebsiteSettingsInput | undefined>(() => {
    if (!data) return undefined;
    const { isSaved: _isSaved, ...values } = data;
    return values;
  }, [data]);

  if (isLoading && !data) return <EditorSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Website Settings"
        subtitle="Contact details, social links, and the text search engines and the home page use."
      />
      {!isOwner && <EditorNotice>Only a Content Owner can change the website settings.</EditorNotice>}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">Site details</span>
          </div>
        }
        headerClassName="border-b"
      >
        <FORM
          schema={websiteSettingsSchema}
          defaultValues={defaultValues}
          onSubmit={async (values) => {
            try {
              await mutate(values);
            } catch {
              /* The error is shown in the footer. */
            }
          }}
        >
          <fieldset disabled={!isOwner} className="flex min-w-0 flex-col gap-8 p-4">
            <FormSection title="Contact" description="Shown in the menu, the footer, and on the Contact page.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds<WebsiteSettingsInput> name="contactEmail" label="Email" type="email" required />
                <FormFeilds<WebsiteSettingsInput> name="contactPhone" label="Phone" required />
              </div>
              <FormFeilds<WebsiteSettingsInput> name="whatsappUrl" label="WhatsApp link" placeholder="https://wa.me/..." />
            </FormSection>
            <FormSection title="Social media" description="Leave a link empty to hide it.">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormFeilds<WebsiteSettingsInput> name="facebookUrl" label="Facebook" placeholder="https://" />
                <FormFeilds<WebsiteSettingsInput> name="instagramUrl" label="Instagram" placeholder="https://" />
              </div>
            </FormSection>
            <FormSection title="Home page and search">
              <FormFeilds<WebsiteSettingsInput> name="homeIntro" label="Home page introduction" type="textarea" required />
              <FormFeilds<WebsiteSettingsInput>
                name="seoDescription"
                label="Description shown in search results"
                type="textarea"
                required
              />
            </FormSection>
            <FormSection title="Page hero styles" description="Choose a coordinated background treatment for the top of each public page.">
              <div className="grid gap-4 sm:grid-cols-2">
                {HERO_PAGE_KEYS.map((page) => (
                  <FormFeilds<WebsiteSettingsInput>
                    key={page}
                    name={`heroThemes.${page}`}
                    label={HERO_PAGE_LABELS[page]}
                    type="select"
                    options={HERO_THEME_SELECT_OPTIONS}
                    renderOption={renderHeroThemeOption}
                  />
                ))}
              </div>
            </FormSection>
            <FormFooter error={error} cancelHref="/content" isSaving={isSaving} submitLabel="Save settings" disabled={!isOwner} />
          </fieldset>
        </FORM>
      </Card>
      <SiteMediaCard />
    </div>
  );
}
