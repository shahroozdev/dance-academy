"use client";

import { useState } from "react";

import { GENERAL_APPLICATION, MAX_RESUME_BYTES, jobApplicationSchema, type JobApplicationInput } from "@/actions/inquiries.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { Label } from "@/components/common/label";
import { FormSentNotice, PUBLIC_FIELD_CLASS, PUBLIC_SUBMIT_CLASS, SpamTrapField } from "@/components/public/public-form-parts";
import { useMutate } from "@/hooks/useMutate";
import { cn } from "@/lib/utils";

type Position = { id: string; title: string };

type JobApplicationFormProps = {
  positions: Position[];
  /** The position chosen with an Apply button, or GENERAL_APPLICATION. */
  defaultPosition: string;
  /** Whether a resume can be attached (file storage is set up). */
  acceptsResume: boolean;
  contactEmail: string;
};

const resumeProblem = (file: File) => {
  if (file.type !== "application/pdf") return "Please attach your resume as a PDF file.";
  if (file.size > MAX_RESUME_BYTES) return "Please attach a PDF of 4 MB or less.";
  return null;
};

export function JobApplicationForm({ positions, defaultPosition, acceptsResume, contactEmail }: JobApplicationFormProps) {
  // Built once: FORM resyncs whenever this object changes identity, which would wipe typing.
  const [defaultValues] = useState<JobApplicationInput>(() => ({
    name: "",
    email: "",
    phone: "",
    jobOpeningId: defaultPosition,
    experience: "",
    availability: "",
    message: "",
    company: "",
  }));
  const [positionOptions] = useState(() => [
    ...positions.map((job) => ({ label: job.title, value: job.id })),
    { label: "General application", value: GENERAL_APPLICATION },
  ]);
  const [resume, setResume] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const { mutate: submitApplication, isLoading } = useMutate("submitJobApplication");

  if (submitted) {
    return (
      <FormSentNotice
        title="Thank you for applying."
        body="We have received your application and will be in touch by email if your experience is a good fit."
      />
    );
  }

  return (
    <FORM
      schema={jobApplicationSchema}
      defaultValues={defaultValues}
      onSubmit={async (data: JobApplicationInput) => {
        if (resumeError) return;
        setFailed(false);
        const formData = new FormData();
        for (const [name, value] of Object.entries(data)) formData.set(name, value ?? "");
        if (resume) formData.set("resume", resume);
        try {
          await submitApplication(formData);
          setSubmitted(true);
        } catch {
          setFailed(true);
        }
      }}
    >
      <div className="grid gap-3 font-public sm:grid-cols-2">
        <FormFeilds name="name" label="Full Name" required className={PUBLIC_FIELD_CLASS} />
        <FormFeilds name="email" label="Email" type="email" required className={PUBLIC_FIELD_CLASS} />
        <FormFeilds name="phone" label="Phone" type="tel" required className={PUBLIC_FIELD_CLASS} />
        <FormFeilds name="jobOpeningId" label="Position" type="select" options={positionOptions} required className={PUBLIC_FIELD_CLASS} />
        <div className="sm:col-span-2">
          <FormFeilds
            name="experience"
            label="Your Experience"
            type="textarea"
            placeholder="The dance styles you have trained in, any teaching experience, and anything else we should know."
            required
            className={PUBLIC_FIELD_CLASS}
          />
        </div>
        <div className="sm:col-span-2">
          <FormFeilds
            name="availability"
            label="Availability"
            placeholder="For example: weekday evenings and Saturday mornings"
            className={PUBLIC_FIELD_CLASS}
          />
        </div>
        {acceptsResume && (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="resume">Resume (PDF, up to 4 MB)</Label>
            <input
              id="resume"
              type="file"
              accept="application/pdf"
              aria-invalid={resumeError ? true : undefined}
              className={cn(
                PUBLIC_FIELD_CLASS,
                "w-full border border-input px-3 py-2 text-sm text-muted-foreground file:mr-3 file:border-0 file:bg-foreground file:px-3 file:py-1 file:font-condensed file:text-xs file:tracking-widest file:text-background file:uppercase",
              )}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setResume(file);
                setResumeError(file && resumeProblem(file));
              }}
            />
            {resumeError && (
              <p className="text-sm text-destructive" role="alert">
                {resumeError}
              </p>
            )}
          </div>
        )}
        <div className="sm:col-span-2">
          <FormFeilds name="message" label="Message" type="textarea" placeholder="Optional" className={PUBLIC_FIELD_CLASS} />
        </div>
        <SpamTrapField>
          <FormFeilds name="company" label="Company" />
        </SpamTrapField>
        {failed && (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            We could not send your application. Please try again, or email us at {contactEmail}.
          </p>
        )}
        <div className="flex flex-col items-start gap-3 sm:col-span-2">
          <Button type="submit" disabled={isLoading} className={PUBLIC_SUBMIT_CLASS}>
            {isLoading ? "Sending…" : "Send Application"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Malhaar Dance Company keeps the details you send only to consider your application.
          </p>
        </div>
      </div>
    </FORM>
  );
}
