import { getPublicSiteSettings } from "@/actions/public-content";
import { Link } from "@/components/Link";
import { NAV_LINKS, SITE_LOCATION_LINE, SITE_NAME } from "@/lib/public-site";

export async function SiteFooter() {
  const settings = await getPublicSiteSettings();

  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-10 lg:flex-row lg:items-start lg:justify-between lg:px-16">
        <div className="flex flex-col gap-2">
          <p className="font-display text-2xl italic">{SITE_NAME}</p>
          <p className="font-public text-sm text-background/70">{SITE_LOCATION_LINE}</p>
          <a
            href={`mailto:${settings.email}`}
            className="font-public text-sm text-background/70 transition-colors hover:text-background"
          >
            {settings.email}
          </a>
          {settings.whatsappUrl && (
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="font-public text-sm text-background/70 transition-colors hover:text-background"
            >
              WhatsApp
            </a>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {settings.socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-public text-sm text-background/70 transition-colors hover:text-background"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-2 sm:grid-cols-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-condensed text-sm tracking-widest uppercase transition-colors hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t border-background/15 px-6 py-4 text-center font-public text-xs tracking-wide text-background/60">
        © {new Date().getFullYear()} {SITE_NAME}
      </p>
    </footer>
  );
}
