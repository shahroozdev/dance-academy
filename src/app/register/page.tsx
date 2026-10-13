import { getRegistrationPrograms } from "@/actions/programs";
import { getSiteLogoUrl } from "@/actions/public-content";
import { getPublicRegistrationPolicy } from "@/actions/settings";
import { RegisterForm } from "@/app/register/register-form";

import type { Metadata } from "next";
  
// The form is sent to families directly, so it stays out of search results.
export const metadata: Metadata = {
  title: "Registration | Malhaar Dance Company",
  robots: { index: false, follow: false },
};

// Always reflects the current active class list — parents must never see a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [programs, policy, logoSrc] = await Promise.all([
    getRegistrationPrograms(),
    getPublicRegistrationPolicy(),
    getSiteLogoUrl(),
  ]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4 py-10">
      <RegisterForm
        programOptions={programs.map((program) => ({ label: program.name, value: program.id }))}
        policy={policy}
        logoSrc={logoSrc}
      />
    </div>
  );
}
