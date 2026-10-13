type JsonLdProps = { data: Record<string, unknown> };

// Structured data for search engines. `<` is escaped so text inside the data can never close the
// script tag early — the approach the Next.js JSON-LD guide recommends.
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
