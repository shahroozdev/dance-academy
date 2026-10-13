import { Link } from "@/components/Link";
import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  solid: "bg-foreground text-background hover:bg-primary hover:text-primary-foreground",
  outline: "border border-foreground text-foreground hover:bg-foreground hover:text-background",
} as const;

type CtaLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
};

// The site's rectangular call-to-action. `href` is a page ("/training"), a spot on the current
// page ("#artists"), or an external destination.
export function CtaLink({ href, children, variant = "solid", className }: CtaLinkProps) {
  const classes = cn(
    "inline-flex h-12 items-center justify-center px-8 font-condensed text-sm font-semibold tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    VARIANT_CLASSES[variant],
    className,
  );

  // A same-page jump scrolls without changing route, so the route-progress bar that
  // `@/components/Link` starts would never finish; a plain anchor avoids that.
  if (href.startsWith("#")) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
