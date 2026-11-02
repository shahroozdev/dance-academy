"use client";

import { useState } from "react";

import {
  INQUIRY_INTERESTS,
  INQUIRY_LOCATIONS,
  websiteInquirySchema,
  type WebsiteInquiryInput,
} from "@/actions/inquiries.schema";
import { Button } from "@/components/common/button";
import { FORM, FormFeilds } from "@/components/common/form";
import { FormSentNotice, PUBLIC_FIELD_CLASS, PUBLIC_SUBMIT_CLASS, SpamTrapField } from "@/components/public/public-form-parts";
import { useMutate } from "@/hooks/useMutate";
import { SITE_EMAIL } from "@/lib/public-site";

const INTEREST_OPTIONS = INQUIRY_INTERESTS.map((value) => ({ label: value, value }));
const LOCATION_OPTIONS = INQUIRY_LOCATIONS.map((value) => ({ label: value, value }));

const isInterest = (value: string | undefined): value is (typeof INQUIRY_INTERESTS)[number] =>
  INQUIRY_INTERESTS.some((interest) => interest === value);

const buildDefaults = (interest: string | undefined) => ({
  name: "",
  email: "",
  phone: "",
  studentName: "",
  studentAge: "",
  interestedIn: isInterest(interest) ? interest : undefined,
  preferredLocation: "" as const,
  message: "",
  company: "",
});

type InquiryFormProps = {
  /** Pre-selects "Interested In", e.g. when arriving from a "Become a Sponsor" button. */
  defaultInterest?: string;
  /** The address offered if the message cannot be sent; the site's current contact email. */
  contactEmail?: string;
};

export function InquiryForm({ defaultInterest, contactEmail = SITE_EMAIL }: InquiryFormProps) {
  // Built once: FORM resyncs whenever this object changes identity, which would wipe typing.
  const [defaultValues] = useState(() => buildDefaults(defaultInterest));
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const { mutate: submitInquiry, isLoading } = useMutate("submitWebsiteInquiry");

  if (submitted) {
    return (
      <FormSentNotice title="Thank you for reaching out." body="We have received your message and will reply by email soon." />
    );
  }

  return (
    <FORM
      schema={websiteInquirySchema}
      defaultValues={defaultValues}
      onSubmit={async (data: WebsiteInquiryInput) => {
        setFailed(false);
        try {
          await submitInquiry(data);
          setSubmitted(true);
        } catch {
          setFailed(true);
        }
      }}
    >
      <div className="grid gap-3 font-public sm:grid-cols-2">
        <FormFeilds name="name" label="Name" required className={PUBLIC_FIELD_CLASS} />
        <FormFeilds name="email" label="Email" type="email" required className={PUBLIC_FIELD_CLASS} />
        <FormFeilds name="phone" label="Phone" type="tel" className={PUBLIC_FIELD_CLASS} />
        <FormFeilds name="interestedIn" label="Interested In" type="select" options={INTEREST_OPTIONS} placeholder="Choose one" required className={PUBLIC_FIELD_CLASS} />
        <FormFeilds name="studentName" label="Student Name (if applicable)" className={PUBLIC_FIELD_CLASS} />
        <div className="grid grid-cols-2 gap-3">
          <FormFeilds name="studentAge" label="Student Age" className={PUBLIC_FIELD_CLASS} />
          <FormFeilds name="preferredLocation" label="Location" type="select" options={LOCATION_OPTIONS} placeholder="Either" className={PUBLIC_FIELD_CLASS} />
        </div>
        <div className="sm:col-span-2">
          <FormFeilds name="message" label="Message" type="textarea" required className={PUBLIC_FIELD_CLASS} />
        </div>
        <SpamTrapField>
          <FormFeilds name="company" label="Company" />
        </SpamTrapField>
        {failed && (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            We could not send your message. Please try again, or email us at {contactEmail}.
          </p>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={isLoading} className={PUBLIC_SUBMIT_CLASS}>
            {isLoading ? "Sending…" : "Send Inquiry"}
          </Button>
        </div>
      </div>
    </FORM>
  );
}
