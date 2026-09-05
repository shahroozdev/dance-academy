// HTML-escapes both admin-authored template text and interpolated values (e.g. a public
// registrant's name) — neither is trusted to be safe to drop directly into HTML.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailShellInput = {
  studioName: string;
  logoUrl: string | null;
  primaryColor: string;
  bodyText: string; // already placeholder-substituted, plain text
  now?: Date; // injectable for the footer's copyright year — keeps this testable/deterministic
};

// The fixed HTML shell every outbound email is wrapped in: a theme-colored header (studio logo,
// or the studio name if no logo is set), the template's body text as paragraphs, and a muted
// footer. This structure is NOT admin-editable — only the body text placed inside it is (see
// @/actions/email-templates) — matching the requirement that the design stays fixed while the
// content can be updated.
export function wrapEmailHtml({ studioName, logoUrl, primaryColor, bodyText, now = new Date() }: EmailShellInput): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p style="margin:0 0 16px;white-space:pre-line;">${escapeHtml(block)}</p>`)
    .join("\n");

  const header = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(studioName)}" style="max-height:48px;max-width:220px;" />`
    : `<span style="font-size:20px;font-weight:600;color:#ffffff;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(studioName)}</span>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background-color:${escapeHtml(primaryColor)};padding:24px;text-align:center;">
                ${header}
              </td>
            </tr>
            <tr>
              <td style="padding:32px 24px;color:#1f1f1f;font-size:15px;line-height:1.5;">
                ${paragraphs}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background-color:#f9f9f9;text-align:center;color:#888888;font-size:12px;">
                © ${now.getFullYear()} ${escapeHtml(studioName)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
