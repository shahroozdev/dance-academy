import { normalizePhoneForWhatsApp } from "@/lib/notifications";
import type { WhatsAppSendInput, WhatsAppSendResult } from "@/types/whatsapp";

// API version is an explicit deployment setting, so an expired version cannot be silently assumed.
export async function sendWhatsAppTemplate(input: WhatsAppSendInput): Promise<WhatsAppSendResult> {
  const version = process.env.WHATSAPP_GRAPH_API_VERSION;
  const to = normalizePhoneForWhatsApp(input.to);
  if (!version || !/^v\d+\.\d+$/.test(version)) return { sent: false, error: "WhatsApp API version is not configured." };
  if (!/^\d+$/.test(input.phoneNumberId) || !/^\d{7,15}$/.test(to) || !input.accessToken) {
    return { sent: false, error: "WhatsApp credentials or recipient phone are invalid." };
  }
  try {
    const response = await fetch(`https://graph.facebook.com/${version}/${input.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp", to, type: "template",
        template: {
          name: input.template, language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US" },
          components: [{ type: "body", parameters: input.parameters.map(text => ({ type: "text", text: text.replace(/\s+/g, " ").trim() })) }],
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const body: unknown = await response.json();
    if (!response.ok) return { sent: false, error: `WhatsApp rejected the request (HTTP ${response.status}). Check the credentials and approved template in Meta.` };
    if (typeof body !== "object" || !body || !("messages" in body) || !Array.isArray(body.messages)) {
      return { sent: false, error: "WhatsApp did not return a message confirmation." };
    }
    const message: unknown = body.messages[0];
    if (typeof message !== "object" || !message || !("id" in message) || typeof message.id !== "string") {
      return { sent: false, error: "WhatsApp did not return a message confirmation." };
    }
    return { sent: true, providerMessageId: message.id };
  } catch {
    return { sent: false, error: "WhatsApp could not confirm the send. Check Meta before retrying to avoid a duplicate." };
  }
}
