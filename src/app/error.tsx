"use client";

import { useEffect } from "react";

import { Button } from "@/components/common/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/common/card";
import { Link } from "@/components/Link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card
        className="w-full max-w-lg"
        header={
          <>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              An unexpected error occurred. Please try again or return to the dashboard.
            </CardDescription>
          </>
        }
      >
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
          <Button asChild>
            <Link href="/admin">Go to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
