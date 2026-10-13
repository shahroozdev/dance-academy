import { redirect } from "next/navigation";

import { getActiveAdmin } from "@/actions/access";
import { getSiteLogoUrl } from "@/actions/public-content";
import { PortalLoginForm } from "@/components/auth/portal-login-form";
import { Card, CardDescription, CardTitle } from "@/components/common/card";
import { Logo } from "@/components/layout/logo";
import { contentAuth } from "@/content-auth";

export default async function AdminLoginPage() {
  if (await getActiveAdmin()) redirect("/admin");
  const contentSession = await contentAuth();
  const hasContentSession = contentSession?.user?.portal === "content";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Logo size={56} src={await getSiteLogoUrl()} />
      <Card
        className="w-full max-w-sm"
        header={
          <>
            <CardTitle>Malhaar Dance Company</CardTitle>
            <CardDescription>Sign in to the studio admin.</CardDescription>
          </>
        }
      >
          <PortalLoginForm portal="admin" hasOtherPortalSession={hasContentSession} />
      </Card>
    </div>
  );
}
