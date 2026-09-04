import { getClasses } from "@/actions/classes";
import { RegisterForm } from "@/app/register/register-form";

// Always reflects the current active class list — parents must never see a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const { data: classes } = await getClasses({ isActive: true, pageSize: 100, sortBy: "name" });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 py-10">
      <RegisterForm
        classOptions={classes.map((c) => ({ label: `${c.name} (${c.danceStyle})`, value: c.id }))}
      />
    </div>
  );
}
