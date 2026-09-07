import { LoginForm } from "@/components/admin/LoginForm";
import { Card, CardDescription, CardTitle } from "@/components/common/card";
import { Logo } from "@/components/layout/logo";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Logo size={56} />
      <Card
        className="w-full max-w-sm"
        header={
          <>
            <CardTitle>Malhaar Dance Company</CardTitle>
            <CardDescription>Sign in to the studio admin.</CardDescription>
          </>
        }
      >
          <LoginForm />
      </Card>
    </div>
  );
}
