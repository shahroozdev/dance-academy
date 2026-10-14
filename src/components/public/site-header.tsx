"use client";

import { CircleUserRound, LogOut, MessageCircle, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

import { signOutOfPublicPortal } from "@/actions/portal-session";
import { PUBLIC_FONT_CLASS } from "@/app/(public)/fonts";
import { Logo } from "@/components/layout/logo";
import { Link } from "@/components/Link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NAV_LINKS, SITE_NAME } from "@/lib/public-site";
import { cn } from "@/lib/utils";
import type { PublicSiteSettings } from "@/types/content";
import type { PublicPortalIdentity } from "@/types/portal-auth";

const SCROLLED_AFTER_PX = 8;

type SiteHeaderProps = {
  /**
   * The element that scrolls the page, when it isn't the window. The home page scrolls inside
   * its own full-screen container; every other page scrolls the window.
   */
  scrollContainerId?: string;
  /** The portals this browser is signed in to; the account menu lists each one. */
  portalIdentities?: PublicPortalIdentity[];
  /** Contact and social details, managed in the Content Portal's Website Settings. */
  settings: PublicSiteSettings;
  /** The logo uploaded in Studio Admin; the site's own logo is used when there is none. */
  logoSrc?: string | null;
};

const isCurrent = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/**
 * Logo + hamburger at every width; the hamburger opens a right-side menu of the site's pages.
 * The same header on every public page: transparent, with no bar behind it.
 */
const portalDestinations = {
  admin: "/admin",
  content: "/content",
};

const portalLabels = {
  admin: "Studio Admin",
  content: "Content Portal",
};

export function SiteHeader({ scrollContainerId, portalIdentities = [], settings, logoSrc }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const container = scrollContainerId ? document.getElementById(scrollContainerId) : null;
    const target = container ?? window;
    const read = () => setScrolled((container ? container.scrollTop : window.scrollY) > SCROLLED_AFTER_PX);
    read();
    target.addEventListener("scroll", read, { passive: true });
    return () => target.removeEventListener("scroll", read);
  }, [scrollContainerId]);

  return (
    <header
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-2 transition-colors duration-300 sm:px-10 lg:px-16 lg:py-5",
        // On a computer the header is always transparent, on every page. On phones and tablets
        // the logo and menu button take up most of the bar, so they get a soft backdrop once
        // content scrolls beneath them.
        scrolled && "bg-background/85 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none",
      )}
    >
      <Link href="/" className="pointer-events-auto flex items-center gap-3" aria-label={`${SITE_NAME} — home`}>
        <Logo size={64} src={logoSrc} />
        <span className="hidden font-display text-xl text-foreground italic drop-shadow-[0_1px_3px_var(--background)] sm:inline">{SITE_NAME}</span>
      </Link>

      <div className="pointer-events-auto flex items-center gap-1">
        {portalIdentities.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-background/70 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label="Open account menu">
              <CircleUserRound className="size-6" strokeWidth={1.5} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {portalIdentities.map((identity, index) => (
                <Fragment key={identity.portal}>
                  {index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="flex flex-col gap-1">
                      <span className="truncate">{identity.name ?? portalLabels[identity.portal]}</span>
                      <span className="text-xs font-normal text-muted-foreground">{portalLabels[identity.portal]}</span>
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href={portalDestinations[identity.portal]}>Open {portalLabels[identity.portal]}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild variant="destructive">
                      <form action={signOutOfPublicPortal.bind(null, identity.portal)}>
                        <button type="submit" className="flex w-full items-center gap-2 text-left">
                          <LogOut />
                          Sign out of {portalLabels[identity.portal]}
                        </button>
                      </form>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="flex size-12 items-center justify-center text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Open menu"
            >
              <Menu className="size-8" strokeWidth={1.5} />
            </button>
          </SheetTrigger>
        <SheetContent
          side="right"
          showCloseButton={false}
          className={cn(
            PUBLIC_FONT_CLASS,
            "h-dvh w-full max-w-100 gap-8 overflow-y-auto border-0 bg-background px-6 py-8 text-foreground sm:max-w-100 sm:px-8",
          )}
        >
          <div className="flex items-center gap-3 pr-14">
            <Logo size={56} src={logoSrc} />
            <SheetTitle className="font-display text-2xl font-normal text-foreground italic">Explore Malhaar</SheetTitle>
          </div>
          <SheetDescription className="sr-only">Go to a page of the website.</SheetDescription>
          <SheetClose asChild>
            <button
              type="button"
              className="absolute top-5 right-6 flex size-12 items-center justify-center text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:right-8"
              aria-label="Close menu"
            >
              <X className="size-8" strokeWidth={1.5} />
            </button>
          </SheetClose>
          <nav aria-label="Main">
            <ul className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
                    className="font-condensed text-2xl font-medium tracking-wide uppercase transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none aria-[current=page]:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-6">
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="font-condensed text-sm font-semibold tracking-widest text-primary uppercase transition-colors hover:text-foreground"
            >
              Register for Classes
            </Link>
            {settings.whatsappUrl && (
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-condensed text-sm font-semibold tracking-widest text-primary uppercase transition-colors hover:text-foreground"
              >
                <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
              </a>
            )}
            {settings.socialLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="font-condensed text-sm tracking-widest text-muted-foreground uppercase transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
          <a
            href={`mailto:${settings.email}`}
            className="font-public text-sm tracking-wide text-muted-foreground transition-colors hover:text-primary"
          >
            {settings.email}
          </a>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
