"use client";

import { useState } from "react";
import { z } from "zod";

import { signInToAdmin, signInToContent } from "@/actions/portal-login";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { useRouter } from "@/hooks/useRouter";
import type { Portal } from "@/types/portal-auth";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const portalActions = {
  admin: signInToAdmin,
  content: signInToContent,
};

const portalDestinations: Record<Portal, string> = {
  admin: "/admin",
  content: "/content",
};

const portalLabels: Record<Portal, string> = {
  admin: "Studio Admin",
  content: "Content Portal",
};

interface PortalLoginFormProps {
  portal: Portal;
}

export function PortalLoginForm({ portal }: PortalLoginFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (values: LoginValues) => {
    setFormError(null);
    let result: Awaited<ReturnType<(typeof portalActions)[Portal]>>;
    try {
      result = await portalActions[portal](values);
    } catch {
      setFormError("Unable to sign in right now. Please try again in a moment.");
      return;
    }

    if (result.status === "success") {
      router.push(portalDestinations[portal]);
      return;
    }

    setFormError(result.status === "invalid-credentials" ? "Invalid email or password." : "Unable to sign in.");
  };

  return (
    <FORM
      schema={loginSchema}
      defaultValues={{ email: "", password: "" }}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
    >
      {(form) => (
        <>
          <FormFeilds<LoginValues> name="email" label="Email" type="email" placeholder="you@example.com" />
          <FormFeilds<LoginValues> name="password" label="Password" type="password" placeholder="Enter your password" />
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in..." : `Sign in to ${portalLabels[portal]}`}
          </Button>
        </>
      )}
    </FORM>
  );
}
