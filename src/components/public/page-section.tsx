import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  plain: "bg-background",
  tint: "bg-muted/60",
} as const;

type PageSectionProps = {
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
  children: React.ReactNode;
};

// A content band on an inner page, with the site's standard width and spacing.
export function PageSection({ tone = "plain", className, children }: PageSectionProps) {
  return (
    <section className={TONE_CLASSES[tone]}>
      <div className={cn("mx-auto w-full max-w-6xl px-6 py-14 sm:px-10 lg:px-16 lg:py-20", className)}>{children}</div>
    </section>
  );
}
