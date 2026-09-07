export type WhatsAppSendInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  template: "monthly_fee_notice" | "payment_reminder";
  parameters: string[];
};

export type WhatsAppSendResult = { sent: boolean; providerMessageId?: string; error?: string };
