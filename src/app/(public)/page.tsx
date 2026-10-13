import { MessageCircle } from "lucide-react";
import Image from "next/image";

import {
  getPublicFestivals,
  getPublicPerformances,
  getPublicProfiles,
  getPublicSiteMedia,
  getPublicSiteSettings,
} from "@/actions/public-content";
import { Link } from "@/components/Link";
import { CtaLink } from "@/components/public/cta-link";
import { InquiryForm } from "@/components/public/inquiry-form";
import { JsonLd } from "@/components/public/json-ld";
import { Panel } from "@/components/public/panel";
import { SectionDots } from "@/components/public/section-dots";
import { SectionHeading } from "@/components/public/section-heading";
import { SectionPager } from "@/components/public/section-pager";
import { SiteHeaderContainer } from "@/components/public/site-header-container";
import { videoDeliveryUrl } from "@/lib/cloudinary-url";
import {
  ABOUT_STORY,
  ANANTA_INTEREST,
  ANANTA_INTRO,
  PERFORMANCE_PHOTOS,
  PERFORMANCES_INTRO,
  PRESS_KINDS,
  SITE_LOCATION_LINE,
  SITE_LOCATIONS,
  SITE_NAME,
  SUPPORT_INTRO,
  TRAINING_PROGRAMS,
  inquiryHref,
} from "@/lib/public-site";
import { jsonLdGraph, organizationJsonLd, pageMetadata, websiteJsonLd } from "@/lib/seo";
import { trainingSlot } from "@/lib/site-media";
import type { PublicImage, PublicPerformance } from "@/types/content";

import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSiteSettings();
  return pageMetadata({
    title: `${SITE_NAME} — Indian Dance Classes in Wood Dale & Elgin, IL`,
    absoluteTitle: true,
    description: settings.seoDescription,
    path: "/",
  });
}

const SCROLL_CONTAINER_ID = "public-scroll";
const LEAD_CLASS = "font-public text-base leading-relaxed text-muted-foreground lg:text-lg";
const EYEBROW_CLASS = "font-condensed text-sm tracking-widest text-primary uppercase";
const TEXT_LINK_CLASS = "font-display text-primary italic hover:underline";
const INSTRUCTOR_FRAME_CLASS = "relative aspect-3/4 w-40 overflow-hidden rounded-t-full shadow-xl lg:w-44";
const SOCIAL_ICON_PATHS = {
  Facebook: (
    <path d="M13.5 21v-8h2.75l.41-3.12H13.5V7.89c0-.9.25-1.52 1.55-1.52h1.66V3.58c-.29-.04-1.27-.12-2.42-.12-2.4 0-4.05 1.46-4.05 4.15v2.27H7.5V13h2.74v8h3.26Z" />
  ),
  Instagram: (
    <>
      <rect width="16" height="16" x="4" y="4" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.25" cy="6.75" r=".75" fill="currentColor" stroke="none" />
    </>
  ),
} as const;
const HOME_PERFORMANCE_PHOTO_COUNT = 4;

// The home page shows a short selection; the full set is on the Performances page. The photos
// are those of the performances published in the Content Portal (covers first, then gallery
// photos); the built-in ones are only used when the portal's content cannot be read.
function homePerformancePhotos(performances: PublicPerformance[]): readonly PublicImage[] {
  const published = [
    ...performances.flatMap((performance) => (performance.cover ? [performance.cover] : [])),
    ...performances.flatMap((performance) => performance.gallery),
  ];
  return (published.length > 0 ? published : PERFORMANCE_PHOTOS).slice(0, HOME_PERFORMANCE_PHOTO_COUNT);
}

// The home page: short full-screen teasers, each leading to its own page.
export default async function HomePage() {
  const [festivals, performances, profiles, settings, siteMedia] = await Promise.all([
    getPublicFestivals(),
    getPublicPerformances(),
    getPublicProfiles(),
    getPublicSiteSettings(),
    getPublicSiteMedia(),
  ]);
  const introVideo = siteMedia["home-intro-video"];
  const founders = siteMedia.founders;
  const latestFestival = festivals.at(0);
  const performancePhotos = homePerformancePhotos(performances);

  return (
    <div className="relative h-dvh">
      {/* Google reads the site's name and the organization's details from the home page. */}
      <JsonLd data={jsonLdGraph(websiteJsonLd(), organizationJsonLd(settings, profiles))} />
      <SiteHeaderContainer scrollContainerId={SCROLL_CONTAINER_ID} />
      <SectionDots scrollContainerId={SCROLL_CONTAINER_ID} />
      <SectionPager scrollContainerId={SCROLL_CONTAINER_ID} />
      <div id={SCROLL_CONTAINER_ID} className="public-scroll h-dvh overflow-x-hidden overflow-y-auto">
        <main>
          <Panel
            id="home"
            label="Home"
            tone="blush"
            decor="right"
            className="relative z-10 flex min-h-dvh items-center pt-32 pb-20 lg:pt-28 lg:pb-16"
            art={
              <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={siteMedia["home-intro-poster"].src}
                  className="size-full object-cover"
                  aria-label={introVideo.alt}
                >
                  <source src={videoDeliveryUrl(introVideo.src)} />
                  Your browser does not support background video.
                </video>
                <div className="absolute inset-0 bg-linear-to-r from-foreground/90 via-foreground/65 to-foreground/20" />
                <div className="absolute inset-0 bg-linear-to-t from-primary/40 via-transparent to-chart-4/20" />
                <div className="hero-color-glow absolute inset-0" />
              </div>
            }
          >
            <div className="max-w-2xl">
              <div className="hero-copy flex flex-col items-start gap-6">
                {/* The label is part of the main heading, so the heading names the company and
                    where it is, not only the tagline. */}
                <h1 className="flex flex-col items-start gap-6">
                  <span className="font-condensed text-sm font-normal tracking-widest text-background/80 uppercase">
                    {SITE_NAME} · {SITE_LOCATION_LINE}
                  </span>
                  <SectionHeading
                    as="span"
                    size="hero"
                    className="block text-background"
                    parts={[
                      { text: "Rooted in" },
                      { text: "Tradition,", accent: true, breakAfter: true },
                      { text: "alive in" },
                      { text: "Expression", accent: true },
                    ]}
                  />
                </h1>
                <p className={`${LEAD_CLASS} max-w-xl text-background/85!`}>{settings.homeIntro}</p>
                <div className="flex flex-wrap gap-3">
                  <CtaLink href="/register">Register for Classes</CtaLink>
                  <CtaLink
                    href="/contact"
                    variant="outline"
                    className="border-background/80 text-background! hover:border-background hover:bg-background hover:text-foreground!"
                  >
                    Contact Malhaar
                  </CtaLink>
                </div>
              </div>
            </div>
          </Panel>

          <Panel id="about" label="About Malhaar" tone="warm" decor="left">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-full shadow-xl">
                <Image
                  src={founders.src}
                  alt={founders.alt}
                  fill
                  sizes="(min-width: 1024px) 24rem, 80vw"
                  className="object-cover"
                  style={{ objectPosition: founders.position }}
                />
              </div>
              <div className="flex flex-col items-center gap-6 text-center">
                <SectionHeading
                  parts={[
                    { text: "A shared" },
                    { text: "Journey", accent: true },
                    { text: "in dance,", breakAfter: true },
                    { text: "from Oman to Chicago", accent: true },
                  ]}
                />
                <p className={LEAD_CLASS}>{ABOUT_STORY[2]}</p>
                <p className={LEAD_CLASS}>
                  Founded by sisters Sreevidhya Vijayan and Varsha Vijayan, whose shared journey in dance began at a
                  young age in Oman.
                </p>
                <CtaLink href="/about" variant="outline">
                  About Malhaar
                </CtaLink>
              </div>
            </div>
          </Panel>

          <Panel id="training" label="Training" tone="lilac" decor="center">
            <div className="flex flex-col gap-8">
              <div className="grid items-end gap-4 lg:grid-cols-2 lg:gap-10">
                <p className={`${LEAD_CLASS} lg:text-right`}>
                  Our training develops strong foundations, musicality, expression, discipline, stage confidence, and
                  an understanding of the art form.
                </p>
                <SectionHeading
                  parts={[
                    { text: "Dance" },
                    { text: "Training", accent: true },
                    { text: "at Malhaar" },
                  ]}
                />
              </div>
              <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {TRAINING_PROGRAMS.map((program) => (
                  <li key={program.name} className="flex flex-col bg-card shadow-sm">
                    <div className="relative aspect-4/3 overflow-hidden">
                      <Image
                        src={siteMedia[trainingSlot(program.name)].src}
                        alt={siteMedia[trainingSlot(program.name)].alt}
                        fill
                        sizes="(min-width: 768px) 30vw, 90vw"
                        className="object-cover"
                        style={{ objectPosition: siteMedia[trainingSlot(program.name)].position }}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-6 text-center">
                      <h3 className="font-public text-xl font-light tracking-wide text-foreground uppercase">
                        {program.name}
                      </h3>
                      <p className="font-public text-sm leading-relaxed text-muted-foreground">{program.summary}</p>
                      <Link href="/register" className={`mt-auto ${TEXT_LINK_CLASS}`}>
                        Register for classes
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-center font-public text-sm text-muted-foreground">
                Classes in {SITE_LOCATIONS.join(" and ")}, Illinois.{" "}
                <Link href="/training" className={TEXT_LINK_CLASS}>
                  Explore our training
                </Link>
              </p>
            </div>
          </Panel>

          <Panel id="instructors" label="Instructors" tone="blush" decor="left">
            <div className="flex flex-col items-center gap-8">
              <SectionHeading
                className="text-center"
                parts={[
                  { text: "Meet the" },
                  { text: "Founders", accent: true },
                  { text: "& instructors" },
                ]}
              />
              <ul className="grid w-full max-w-4xl gap-8 sm:grid-cols-2 lg:gap-12">
                {profiles.map((instructor) => (
                  <li key={instructor.name} className="flex flex-col items-center gap-2 text-center">
                    {instructor.photo && (
                      <div className={INSTRUCTOR_FRAME_CLASS}>
                        <Image
                          src={instructor.photo.src}
                          alt={instructor.photo.alt}
                          fill
                          sizes="12rem"
                          className="object-cover object-top"
                        />
                      </div>
                    )}
                    <h3 className="mt-2 font-public text-xl font-light tracking-wide text-foreground uppercase">
                      {instructor.name}
                    </h3>
                    <p className="font-display text-primary italic">{instructor.title}</p>
                    <p className="font-public text-sm leading-relaxed text-muted-foreground">{instructor.summary}</p>
                  </li>
                ))}
              </ul>
              <CtaLink href="/instructors" variant="outline">
                Meet the Instructors
              </CtaLink>
            </div>
          </Panel>

          <Panel id="performances" label="Performances" tone="warm" decor="right">
            <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-12">
              <div className="flex flex-col items-start gap-6 lg:col-span-2">
                <SectionHeading
                  parts={[
                    { text: "From training" },
                    { text: "to the Stage", accent: true },
                  ]}
                />
                <p className={LEAD_CLASS}>{PERFORMANCES_INTRO[0]}</p>
                <CtaLink href="/performances">View Performances</CtaLink>
              </div>
              <ul className="grid grid-cols-2 gap-4 lg:col-span-3">
                {performancePhotos.map((photo) => (
                  <li key={photo.src} className="relative aspect-4/3 overflow-hidden shadow-sm">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(min-width: 1024px) 28vw, 45vw"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel id="ananta" label="Malhaar Ananta Arts Festival" tone="lilac" decor="center">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              {latestFestival && (
                <div className="flex flex-col gap-6 bg-card/80 p-8 shadow-sm">
                  <p className={EYEBROW_CLASS}>{latestFestival.label}</p>
                  <p className="font-public text-xl font-light text-foreground">
                    {latestFestival.date} · {latestFestival.time}
                  </p>
                  <p className="font-public text-muted-foreground">{latestFestival.venue}</p>
                  <ul className="flex flex-col gap-3 border-t border-border pt-6">
                    {latestFestival.artists.map((artist) => (
                      <li key={artist.name} className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-public text-lg font-light tracking-wide text-foreground uppercase">
                          {artist.name}
                        </span>
                        <span className="font-display text-primary italic">{artist.form}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="font-public text-sm text-muted-foreground">With live musical accompaniment.</p>
                </div>
              )}
              <div className={`flex flex-col items-center gap-8 text-center ${latestFestival ? "" : "lg:col-span-2"}`}>
                <SectionHeading
                  size="stacked"
                  parts={[
                    { text: "Malhaar", breakAfter: true },
                    { text: "Ananta", accent: true, breakAfter: true },
                    { text: "Arts Festival", breakAfter: true },
                    ...(latestFestival ? [{ text: latestFestival.year, accent: true }] : []),
                  ]}
                />
                <p className={LEAD_CLASS}>{ANANTA_INTRO[0]}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {latestFestival?.ticketUrl && <CtaLink href={latestFestival.ticketUrl}>Book Tickets</CtaLink>}
                  {latestFestival && <CtaLink href="/ananta">Discover Ananta Arts Festival</CtaLink>}
                  <CtaLink href={inquiryHref(ANANTA_INTEREST)} variant="outline">
                    Become a Sponsor
                  </CtaLink>
                </div>
              </div>
            </div>
          </Panel>

          <Panel id="press" label="Press & Media" tone="warm" decor="left">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
              <SectionHeading
                parts={[
                  { text: "Malhaar" },
                  { text: "in the Press", accent: true },
                  { text: "& media" },
                ]}
              />
              <p className={LEAD_CLASS}>
                {SITE_NAME}’s journey continues to grow through performances, collaborations, cultural initiatives,
                and engagement with the wider arts community.
              </p>
              <ul className="flex flex-wrap justify-center gap-3">
                {PRESS_KINDS.map((kind) => (
                  <li
                    key={kind}
                    className="border border-primary/30 bg-card/70 px-4 py-2 font-condensed text-sm tracking-widest text-foreground uppercase"
                  >
                    {kind}
                  </li>
                ))}
              </ul>
              <CtaLink href="/press">Press & Media</CtaLink>
            </div>
          </Panel>

          <Panel id="support" label="Support Malhaar" tone="blush" decor="right">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 text-center">
              <SectionHeading
                parts={[
                  { text: "Help keep the" },
                  { text: "Arts thriving", accent: true },
                ]}
              />
              <p className={LEAD_CLASS}>{SUPPORT_INTRO[0]}</p>
              <CtaLink href="/support">Contact Malhaar</CtaLink>
            </div>
          </Panel>

          <Panel
            id="contact"
            label="Contact"
            tone="warm"
            decor="left"
            footer={
              <footer className="font-public text-xs tracking-wide text-muted-foreground">
                © {new Date().getFullYear()} {SITE_NAME} · {SITE_LOCATION_LINE}
              </footer>
            }
          >
            <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-12">
              <div className="flex flex-col gap-6 lg:col-span-2">
                <SectionHeading
                  parts={[
                    { text: "Get in" },
                    { text: "Touch", accent: true },
                  ]}
                />
                <p className={LEAD_CLASS}>
                  Interested in joining Malhaar, booking a performance, or supporting our work? Send us a message.
                </p>
                <dl className="grid grid-cols-2 gap-6">
                  {SITE_LOCATIONS.map((location) => (
                    <div key={location}>
                      <dt className="font-public text-lg font-light tracking-wide text-foreground uppercase">
                        {location}
                      </dt>
                      <dd className="font-public text-sm text-muted-foreground">Illinois</dd>
                    </div>
                  ))}
                </dl>
                <a href={`mailto:${settings.email}`} className="font-display text-lg text-primary italic hover:underline">
                  {settings.email}
                </a>
                <nav aria-label="Follow Malhaar on social media">
                  <ul className="flex items-center gap-3">
                    {settings.socialLinks.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Follow Malhaar on ${link.label}`}
                          className="flex size-10 items-center justify-center border border-primary/35 text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-1.75">
                            {SOCIAL_ICON_PATHS[link.label]}
                          </svg>
                        </a>
                      </li>
                    ))}
                    {settings.whatsappUrl && (
                      <li>
                        <a
                          href={settings.whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Message Malhaar on WhatsApp"
                          className="flex size-10 items-center justify-center border border-primary/35 text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <MessageCircle aria-hidden="true" className="size-5" strokeWidth={1.75} />
                        </a>
                      </li>
                    )}
                  </ul>
                </nav>
              </div>
              <div className="lg:col-span-3">
                <InquiryForm contactEmail={settings.email} />
              </div>
            </div>
          </Panel>
        </main>
      </div>
    </div>
  );
}
