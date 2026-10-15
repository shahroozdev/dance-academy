import { Skeleton } from "@/components/common/skeleton";
import { PageSection } from "@/components/public/page-section";
import { HERO_THEME_STYLES } from "@/lib/site-appearance";
import { cn } from "@/lib/utils";

const POSTER_SKELETONS = ["poster-one", "poster-two"] as const;
const ARTIST_SKELETONS = ["artist-one", "artist-two"] as const;

function TextLines({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Skeleton className="mx-auto h-4 w-full max-w-2xl" />
      <Skeleton className="mx-auto mt-3 h-4 w-11/12 max-w-xl" />
      <Skeleton className="mx-auto mt-3 h-4 w-4/5 max-w-lg" />
    </div>
  );
}

/** Matches the main content bands of a festival page while its published edition is loading. */
export function FestivalViewSkeleton() {
  const styles = HERO_THEME_STYLES.PLUM;

  return (
    <div aria-busy="true" aria-label="Loading Ananta Festival" role="status">
      <span className="sr-only">Loading Ananta Festival</span>

      <section className={cn("relative isolate overflow-hidden bg-linear-to-br", styles.background)}>
        <div aria-hidden="true" className={cn("pointer-events-none absolute -top-32 -right-32 -z-10 size-96 rounded-full blur-3xl", styles.glow)} />
        <div aria-hidden="true" className={cn("pointer-events-none absolute -bottom-72 -left-40 -z-10 size-160 rounded-full border", styles.ring)} />
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pt-24 pb-16 text-center sm:px-10 lg:pt-36 lg:pb-24">
          <Skeleton className="h-4 w-52" />
          <div className="flex w-full max-w-3xl flex-col items-center gap-4">
            <Skeleton className="h-12 w-4/5 sm:h-14 lg:h-16" />
            <Skeleton className="h-12 w-3/5 sm:h-14 lg:h-16" />
            <Skeleton className="h-12 w-2/5 sm:h-14 lg:h-16" />
          </div>
          <TextLines className="w-full max-w-2xl" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-5 w-72" />
          <div className="flex flex-wrap justify-center gap-3">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-36" />
            <Skeleton className="h-11 w-40" />
          </div>
        </div>
      </section>

      <PageSection>
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <Skeleton className="h-11 w-72" />
          <TextLines className="w-full" />
          <TextLines className="w-full" />
        </div>
      </PageSection>

      <PageSection tone="tint">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <Skeleton className="mx-auto h-11 w-72" />
          <div className="grid gap-6 sm:grid-cols-2">
            {POSTER_SKELETONS.map((poster) => (
              <Skeleton key={poster} className="aspect-3/4 w-full" />
            ))}
          </div>
        </div>
      </PageSection>

      <PageSection tone="tint">
        <div className="flex flex-col items-center gap-10">
          <Skeleton className="h-11 w-64" />
          <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
            {ARTIST_SKELETONS.map((artist) => (
              <div key={artist} className="flex flex-col items-center gap-4 bg-card px-6 py-10">
                <Skeleton className="size-40 rounded-full" />
                <Skeleton className="h-7 w-3/5" />
                <Skeleton className="h-5 w-2/5" />
                <TextLines className="w-full" />
              </div>
            ))}
          </div>
          <TextLines className="w-full max-w-3xl" />
        </div>
      </PageSection>

      <PageSection>
        <div className="grid gap-6 lg:grid-cols-2">
          {POSTER_SKELETONS.map((card) => (
            <div key={card} className="flex min-h-64 flex-col gap-4 border border-primary/30 bg-card p-8">
              <Skeleton className="h-6 w-3/5" />
              <TextLines className="w-full" />
              <Skeleton className="mt-auto h-11 w-40" />
            </div>
          ))}
        </div>
      </PageSection>

      <PageSection tone="tint">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <Skeleton className="h-11 w-80" />
          <TextLines className="w-full" />
        </div>
      </PageSection>
    </div>
  );
}
