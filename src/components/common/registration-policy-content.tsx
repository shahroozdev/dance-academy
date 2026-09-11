import { BookOpenText } from "lucide-react";

import { cn } from "@/lib/utils";

type RegistrationPolicyContentProps = {
  title: string;
  content: string;
  version?: number;
  className?: string;
};

export function RegistrationPolicyContent({
  title,
  content,
  version,
  className,
}: RegistrationPolicyContentProps) {
  const sections = content.split(/\n\s*\n/).map((section) => section.trim()).filter(Boolean);

  return (
    <section className={cn("space-y-5", className)} aria-labelledby="registration-policy-title">
      <div className="flex items-start gap-3 border-b pb-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BookOpenText className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="registration-policy-title" className="font-semibold leading-snug text-foreground">
            {title}
          </h2>
          {version !== undefined && (
            <p className="mt-0.5 text-xs text-muted-foreground">Policy version {version}</p>
          )}
        </div>
      </div>
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        {sections.map((section, index) => {
          const [heading, ...bodyLines] = section.split("\n");
          const body = bodyLines.join("\n").trim();
          return (
            <div
              key={`${heading}-${index}`}
              className="rounded-lg border border-border/60 bg-background/70 p-3 shadow-xs"
            >
              <h3 className="mb-1 font-medium text-foreground">{heading}</h3>
              {body && <p className="whitespace-pre-line">{body}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
