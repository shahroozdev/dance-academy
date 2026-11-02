import { cn } from "@/lib/utils";

export type HeadingPart = { text: string; breakAfter?: boolean };

const SIZE_CLASSES = {
  hero: "text-4xl sm:text-5xl lg:text-6xl xl:text-7xl",
  section: "text-3xl sm:text-4xl lg:text-5xl",
  stacked: "text-4xl leading-tight sm:text-5xl lg:text-6xl lg:leading-tight",
} as const;

type SectionHeadingProps = {
  parts: HeadingPart[];
  /** "span" is for a headline placed inside a heading that the caller renders itself. */
  as?: "h1" | "h2" | "span";
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
};

// The site's section heading: the italic serif, on every page.
export function SectionHeading({ parts, as: Tag = "h2", size = "section", className }: SectionHeadingProps) {
  return (
    <Tag className={cn("font-display font-normal text-foreground italic", SIZE_CLASSES[size], className)}>
      {parts.map((part) => (
        <span key={part.text}>
          {part.text}
          {part.breakAfter ? <br /> : " "}
        </span>
      ))}
    </Tag>
  );
}
