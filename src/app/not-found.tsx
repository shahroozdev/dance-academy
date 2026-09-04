import { Button } from "@/components/common/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/common/card";
import { Link } from "@/components/Link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card
        className="w-full max-w-lg"
        header={
          <>
            <CardTitle>Page not found</CardTitle>
            <CardDescription>
              The page you are looking for does not exist or has been moved.
            </CardDescription>
          </>
        }
      >
        <CardContent>
          <Button asChild>
            <Link href="/admin">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
