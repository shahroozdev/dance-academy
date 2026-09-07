import { getRegistrationClasses } from "@/actions/classes";
import { RegisterForm } from "@/app/register/register-form";
  
// Always reflects the current active class list — parents must never see a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const classes = await getRegistrationClasses();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4 py-10">
      <RegisterForm
        classOptions={classes.map((c) => ({ label: `${c.name} (${c.danceStyle})`, value: c.id }))}
      />
    </div>
  );
}
