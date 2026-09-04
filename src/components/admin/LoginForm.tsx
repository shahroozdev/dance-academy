"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { useRouter } from "@/hooks/useRouter";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (values: LoginValues) => {
    setFormError(null);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (!result || result.error) {
      setFormError("Invalid email or password.");
      return;
    }

    router.push("/admin");
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
          <FormFeilds<LoginValues> name="password" label="Password" type="password" placeholder="••••••••" />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </>
      )}
    </FORM>
  );
}
