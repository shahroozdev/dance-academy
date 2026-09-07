import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { sendWhatsAppTemplate } from "@/lib/whatsapp";

const input = { phoneNumberId: "123", accessToken: "test-secret", to: "5551234567", template: "monthly_fee_notice" as const, parameters: ["Parent", "September 2026", "Nia – $40.00"] };
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); vi.stubEnv("WHATSAPP_GRAPH_API_VERSION", "v99.0"); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it("sends the approved template and returns the provider reference", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messages: [{ id: "wamid.test" }] }) });
  expect(await sendWhatsAppTemplate(input)).toEqual({ sent: true, providerMessageId: "wamid.test" });
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe("https://graph.facebook.com/v99.0/123/messages");
  expect(JSON.parse(request.body)).toMatchObject({ to: "15551234567", template: { name: "monthly_fee_notice", components: [{ type: "body", parameters: input.parameters.map(text => ({ type: "text", text })) }] } });
});
it("does not pretend rejection or missing confirmation is a successful send", async () => {
  fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
  expect((await sendWhatsAppTemplate(input)).sent).toBe(false);
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  expect((await sendWhatsAppTemplate(input)).sent).toBe(false);
});
it("makes no request when configuration is missing", async () => {
  vi.stubEnv("WHATSAPP_GRAPH_API_VERSION", "");
  expect((await sendWhatsAppTemplate(input)).sent).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});
