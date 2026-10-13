"use server";

import { requireContentOwner, requireContentUser } from "@/actions/content-access";
import { recordContentAudit, revalidateWholePublicSite } from "@/actions/content-service";
import { websiteSettingsSchema, type WebsiteSettingsInput } from "@/actions/content.schema";
import { db } from "@/lib/db";
import { DEFAULT_SITE_SETTINGS } from "@/lib/public-site";

/** The saved website settings as form values, or the site's current fixed details if none are saved yet. */
export async function getContentWebsiteSettings(): Promise<WebsiteSettingsInput & { isSaved: boolean }> {
  await requireContentUser();
  const saved = await db.websiteSettings.findUnique({ where: { id: "default" } });
  if (!saved) {
    const [facebook, instagram] = ["Facebook", "Instagram"].map(
      (label) => DEFAULT_SITE_SETTINGS.socialLinks.find((link) => link.label === label)?.href ?? "",
    );
    return {
      contactEmail: DEFAULT_SITE_SETTINGS.email,
      contactPhone: DEFAULT_SITE_SETTINGS.phone,
      whatsappUrl: DEFAULT_SITE_SETTINGS.whatsappUrl ?? "",
      facebookUrl: facebook,
      instagramUrl: instagram,
      seoDescription: DEFAULT_SITE_SETTINGS.seoDescription,
      homeIntro: DEFAULT_SITE_SETTINGS.homeIntro,
      isSaved: false,
    };
  }
  return {
    contactEmail: saved.contactEmail,
    contactPhone: saved.contactPhone,
    whatsappUrl: saved.whatsappUrl ?? "",
    facebookUrl: saved.facebookUrl ?? "",
    instagramUrl: saved.instagramUrl ?? "",
    seoDescription: saved.seoDescription,
    homeIntro: saved.homeIntro,
    isSaved: true,
  };
}

export async function updateWebsiteSettings(data: WebsiteSettingsInput) {
  const user = await requireContentOwner();
  data = websiteSettingsSchema.parse(data);

  const columns = {
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone,
    whatsappUrl: data.whatsappUrl || null,
    facebookUrl: data.facebookUrl || null,
    instagramUrl: data.instagramUrl || null,
    seoDescription: data.seoDescription,
    homeIntro: data.homeIntro,
    updatedByName: user.name,
  };
  await db.websiteSettings.upsert({ where: { id: "default" }, create: { id: "default", ...columns }, update: columns });
  await recordContentAudit(user, {
    action: "updated",
    entityType: "settings",
    entityId: "default",
    summary: "Updated the website settings.",
  });
  revalidateWholePublicSite();
  return { saved: true };
}
