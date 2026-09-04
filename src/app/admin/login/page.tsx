import { LoginForm } from "@/components/admin/LoginForm";
import { Card, CardDescription, CardTitle } from "@/components/common/card";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
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
