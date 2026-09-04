import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/card";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Malhaar Dance Company Registration</CardTitle>
          <CardDescription>
            The registration form is coming soon. See docs/03-routes-and-pages.md §3.2 for the planned fields.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
