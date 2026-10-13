"use client";

import { profileSchema, type ProfileInput } from "@/actions/content.schema";
import { FORM, FormFeilds } from "@/components/common/form";
import { Switch } from "@/components/common/switch";
import { useContentUser } from "@/components/content/content-user-context";
import { FormFooter, FormSection } from "@/components/content/editor-parts";
import { MediaField } from "@/components/content/media-field";
import type { QueryData } from "@/hooks/query-registry";
import { useQuery } from "@/hooks/useQuery";

export const EMPTY_PROFILE: ProfileInput = {
  name: "",
  title: "",
  summary: "",
  biography: "",
  specializations: "",
  photoId: "",
  isVisible: false,
};

export const toProfileFormValues = (profile: QueryData<"getContentProfileById">): ProfileInput => ({
  name: profile.name,
  title: profile.title,
  summary: profile.summary,
  biography: profile.biography,
  specializations: profile.specializations.join("\n"),
  photoId: profile.photoId ?? "",
  isVisible: profile.isVisible,
});

type ProfileFormProps = {
  defaultValues: ProfileInput;
  onSubmit: (values: ProfileInput) => Promise<unknown>;
  isSaving: boolean;
  error?: unknown;
  submitLabel: string;
  disabled?: boolean;
};

export function ProfileForm({ defaultValues, onSubmit, isSaving, error, submitLabel, disabled = false }: ProfileFormProps) {
  const { isOwner } = useContentUser();
  const { data: assets } = useQuery("getContentMediaAssets", [{ kind: "IMAGE" }]);

  return (
    <FORM
      schema={profileSchema}
      defaultValues={defaultValues}
      onSubmit={async (values) => {
        try {
          await onSubmit(values);
        } catch {
          /* The error is shown in the footer. */
        }
      }}
    >
      {(form) => (
        <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-8 p-4">
          <FormSection title="Profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormFeilds<ProfileInput> name="name" label="Name" required />
              <FormFeilds<ProfileInput> name="title" label="Title" placeholder="e.g. Co-Founder & Instructor" required />
            </div>
            <FormFeilds<ProfileInput>
              name="summary"
              label="Short summary"
              type="textarea"
              placeholder="One or two sentences shown on the card."
              required
            />
            <FormFeilds<ProfileInput>
              name="biography"
              label="Biography"
              type="textarea"
              placeholder="Leave a blank line between paragraphs."
              required
            />
            <FormFeilds<ProfileInput>
              name="specializations"
              label="Specializations"
              type="textarea"
              placeholder="One per line, e.g. Bharatanatyam"
            />
            <MediaField<ProfileInput> name="photoId" label="Portrait" assets={assets} />
          </FormSection>

          <FormSection title="Visibility">
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div className="min-w-0">
                <label htmlFor="profile-visible" className="text-sm font-medium">
                  Show this profile on the website
                </label>
                <p className="text-sm text-muted-foreground">
                  {isOwner
                    ? "While this is off, the profile is saved here but visitors never see it."
                    : "Only a Content Owner can show or hide a profile."}
                </p>
              </div>
              <Switch
                id="profile-visible"
                checked={form.watch("isVisible")}
                onCheckedChange={(checked) => form.setValue("isVisible", checked, { shouldDirty: true })}
                disabled={disabled || !isOwner}
              />
            </div>
          </FormSection>

          <FormFooter
            error={error}
            cancelHref="/content/profiles"
            isSaving={isSaving}
            submitLabel={submitLabel}
            disabled={disabled}
          />
        </fieldset>
      )}
    </FORM>
  );
}
