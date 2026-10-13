import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { SITE_LOCATION_LINE, SITE_NAME } from "@/lib/public-site";

// The picture shown when any public page is shared (WhatsApp, Facebook, X, iMessage) and the
// image search engines may use for the site. Built once at build time.
export const alt = `${SITE_NAME} — Indian classical and cinematic dance in ${SITE_LOCATION_LINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// This image is drawn outside the page, so the site's Tailwind theme tokens are not available
// here; these are the brand's primary colour and soft background, written out.
const BRAND = "#9B1B5E";
const INK = "#2A1A24";
const WASH = "linear-gradient(135deg, #FBE8F0 0%, #FFFDFB 55%, #F3E8FA 100%)";

const asDataUri = async (file: string, type: string) =>
  `data:${type};base64,${(await readFile(join(process.cwd(), "public", "images", "site", file))).toString("base64")}`;

export default async function OpengraphImage() {
  const [logo, photo] = await Promise.all([
    asDataUri("share-logo.png", "image/png"),
    asDataUri("share-photo.jpg", "image/jpeg"),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: WASH, color: INK }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 56px 0 72px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain elements only */}
          <img src={logo} width={150} height={150} alt="" />
          <div style={{ display: "flex", marginTop: 28, fontSize: 64, fontWeight: 300, lineHeight: 1.1 }}>
            {SITE_NAME}
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: BRAND }}>
            Indian classical &amp; cinematic dance
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 26, letterSpacing: 3, textTransform: "uppercase" }}>
            {SITE_LOCATION_LINE}
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain elements only */}
        <img src={photo} width={630} height={630} alt="" />
      </div>
    ),
    size,
  );
}
