import { Button } from "@/components/common/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/common/card";
import { Link } from "@/components/Link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found | Malhaar Dance Company",
  robots: { index: false, follow: true },
};

// Shown for any address that doesn't exist. Most people who land here are website visitors, so
// the way back is the home page; its menu reaches every public page.
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
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">Go to the home page</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Contact us</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
