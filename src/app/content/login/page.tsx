import { redirect } from "next/navigation";

import { getActiveContentUser } from "@/actions/content-access";
import { getSiteLogoUrl } from "@/actions/public-content";
import { PortalLoginForm } from "@/components/auth/portal-login-form";
import { Card, CardDescription, CardTitle } from "@/components/common/card";
import { Logo } from "@/components/layout/logo";

export default async function ContentLoginPage() {
  if (await getActiveContentUser()) redirect("/content");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Logo size={56} src={await getSiteLogoUrl()} />
      <Card
        className="w-full max-w-sm"
        header={
          <>
            <CardTitle>Content Portal</CardTitle>
            <CardDescription>Sign in to manage the public website.</CardDescription>
          </>
        }
      >
        <PortalLoginForm portal="content" />
      </Card>
    </div>
  );
}
