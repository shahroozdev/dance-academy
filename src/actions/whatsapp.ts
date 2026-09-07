import "server-only";

import { decryptSecret } from "@/lib/crypto";
import { db } from "@/lib/db";
import { sendWhatsAppTemplate } from "@/lib/whatsapp";
import type { WhatsAppSendInput, WhatsAppSendResult } from "@/types/whatsapp";

export async function sendConfiguredWhatsApp(
  to: string, template: WhatsAppSendInput["template"], parameters: string[],
): Promise<WhatsAppSendResult> {
  const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
  if (!settings?.whatsappPhoneNumberId || !settings.whatsappAccessToken) {
    return { sent: false, error: "Configure WhatsApp credentials in Settings first." };
  }
  try {
    return await sendWhatsAppTemplate({ to, template, parameters, phoneNumberId: settings.whatsappPhoneNumberId, accessToken: decryptSecret(settings.whatsappAccessToken) });
  } catch {
    return { sent: false, error: "WhatsApp credentials could not be read. Re-save the access token in Settings." };
  }
}
