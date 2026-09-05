import { z } from "zod";

export const emailTemplateUpdateSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Body is required").max(5000),
});

export type EmailTemplateUpdateInput = z.infer<typeof emailTemplateUpdateSchema>;
