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
    <section className={cn("space-y-4", className)} aria-labelledby="registration-policy-title">
      <div>
        <h2 id="registration-policy-title" className="font-semibold text-foreground">
          {title}
        </h2>
        {version !== undefined && (
          <p className="text-xs text-muted-foreground">Policy version {version}</p>
        )}
      </div>
      <div className="space-y-4 text-sm leading-6 text-muted-foreground">
        {sections.map((section, index) => {
          const [heading, ...bodyLines] = section.split("\n");
          const body = bodyLines.join("\n").trim();
          return (
            <div key={`${heading}-${index}`} className="space-y-1">
              <h3 className="font-medium text-foreground">{heading}</h3>
              {body && <p className="whitespace-pre-line">{body}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
