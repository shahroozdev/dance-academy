import { CheckCircle2 } from "lucide-react";

// Shared by the website's contact and job application forms.

export const PUBLIC_FIELD_CLASS = "rounded-none bg-background/80";

export const PUBLIC_SUBMIT_CLASS =
  "h-12 rounded-none bg-foreground px-8 font-condensed text-sm font-semibold tracking-widest text-background uppercase hover:bg-primary hover:text-primary-foreground";

/** What a form turns into once it has been sent. */
export function FormSentNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-start gap-3 bg-background/80 p-8" role="status">
      <CheckCircle2 className="size-8 text-primary" />
      <p className="font-display text-2xl text-foreground italic">{title}</p>
      <p className="font-public text-muted-foreground">{body}</p>
    </div>
  );
}

/** The hidden field that catches automated submissions. */
export function SpamTrapField({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden" aria-hidden="true">
      {children}
    </div>
  );
}
