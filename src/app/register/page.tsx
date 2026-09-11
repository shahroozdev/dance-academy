import { getRegistrationPrograms } from "@/actions/programs";
import { getPublicRegistrationPolicy } from "@/actions/settings";
import { RegisterForm } from "@/app/register/register-form";
  
// Always reflects the current active class list — parents must never see a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [programs, policy] = await Promise.all([
    getRegistrationPrograms(),
    getPublicRegistrationPolicy(),
  ]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4 py-10">
      <RegisterForm
        programOptions={programs.map((program) => ({ label: program.name, value: program.id }))}
        policy={policy}
      />
    </div>
  );
}
