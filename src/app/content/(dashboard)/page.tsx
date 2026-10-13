import { FilePenLine, Image as ImageIcon, Newspaper, PartyPopper, Plus, UserRound, type LucideIcon } from "lucide-react";

import { getContentOverview } from "@/actions/content-overview";
import { Button } from "@/components/common/button";
import { Card, CardDescription, CardTitle } from "@/components/common/card";
import { Link } from "@/components/Link";

type Overview = Awaited<ReturnType<typeof getContentOverview>>;

type ContentArea = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** The numbers shown on the card, e.g. "2 drafts". */
  figures: (overview: Overview) => string[];
  addHref?: string;
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

const statusFigures = (counts: Overview["counts"]["festival"]) => [
  `${counts.PUBLISHED} published`,
  plural(counts.DRAFT, "draft"),
  `${counts.ARCHIVED} archived`,
];

const CONTENT_AREAS: ContentArea[] = [
  {
    title: "Festivals",
    description: "Festival editions, artists, ticket links, posters, and sponsors.",
    href: "/content/festivals",
    addHref: "/content/festivals/new",
    icon: PartyPopper,
    figures: (overview) => statusFigures(overview.counts.festival),
  },
  {
    title: "Performances",
    description: "Performance details, covers, galleries, and links.",
    href: "/content/performances",
    addHref: "/content/performances/new",
    icon: FilePenLine,
    figures: (overview) => statusFigures(overview.counts.performance),
  },
  {
    title: "Press & Media",
    description: "News coverage, interviews, articles, and downloadable documents.",
    href: "/content/press",
    addHref: "/content/press/new",
    icon: Newspaper,
    figures: (overview) => statusFigures(overview.counts.press),
  },
  {
    title: "Media Library",
    description: "Website images, video links, and documents, with their descriptions.",
    href: "/content/media",
    icon: ImageIcon,
    figures: (overview) => [plural(overview.mediaCount, "file")],
  },
  {
    title: "Public Profiles",
    description: "Founder and instructor profiles and whether each is shown.",
    href: "/content/profiles",
    addHref: "/content/profiles/new",
    icon: UserRound,
    figures: (overview) => [`${overview.visibleProfiles} on the website`, `${overview.hiddenProfiles} hidden`],
  },
];

const formatWhen = (value: Date) => value.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

export default async function ContentDashboardPage() {
  const overview = await getContentOverview();
  const isOwner = overview.role === "OWNER";
  const unpublishedDrafts = overview.counts.festival.DRAFT + overview.counts.performance.DRAFT + overview.counts.press.DRAFT;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">{isOwner ? "Content Owner" : "Content Editor"}</p>
        <h1 className="mt-1 font-display text-3xl text-foreground">Website content</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Manage public-site content here. Studio students, classes, payments, and billing are intentionally unavailable
          in this portal.
        </p>
        <p className="mt-2 text-sm text-foreground">
          {unpublishedDrafts === 0
            ? "There are no drafts waiting to be published."
            : `${plural(unpublishedDrafts, "draft")} ${unpublishedDrafts === 1 ? "is" : "are"} waiting ${isOwner ? "for you to publish" : "for a Content Owner to publish"}.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_AREAS.map(({ title, description, href, addHref, icon: Icon, figures }) => (
          <Card
            key={title}
            className="min-h-40"
            header={
              <>
                <Icon className="size-5 text-primary" />
                <CardTitle className="mt-3">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </>
            }
            contentClassName="flex flex-1 flex-col gap-4"
          >
            <p className="text-sm text-muted-foreground">{figures(overview).join(" · ")}</p>
            <div className="mt-auto flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={href}>Open</Link>
              </Button>
              {addHref && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={addHref}>
                    <Plus />
                    Add
                  </Link>
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {isOwner && (
        <Card
          header={<CardTitle>Recent changes</CardTitle>}
          headerClassName="border-b"
          footer={
            <Button asChild variant="ghost" size="sm">
              <Link href="/content/history">See the full history</Link>
            </Button>
          }
          footerClassName="border-t"
        >
          {overview.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing has been changed in the portal yet.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {overview.recentActivity.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="text-sm text-foreground">{entry.summary}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {entry.userName} · {formatWhen(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
