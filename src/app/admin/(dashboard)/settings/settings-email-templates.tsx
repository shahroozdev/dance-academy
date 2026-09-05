"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";

import type { EmailTemplateData } from "@/actions/email-templates";
import { emailTemplateUpdateSchema, type EmailTemplateUpdateInput } from "@/actions/email-templates.schema";
import { Button } from "@/components/common/button";
import { Card, CardTitle } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { FieldDescription } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { EMAIL_TEMPLATE_KEYS, EMAIL_TEMPLATES, type EmailTemplateKeyValue } from "@/lib/email-templates";

// Keyed by template.key so switching the dropdown fully remounts the form with the newly
// selected template's own values, rather than resyncing on top of whatever was mid-edit for the
// previous selection.
function EmailTemplateForm({ template }: { template: EmailTemplateData }) {
  const meta = EMAIL_TEMPLATES[template.key];
  const { mutate: updateTemplate, isLoading } = useMutate("updateEmailTemplate", {
    invalidateKeys: ["getEmailTemplates"],
  });

  return (
    <FORM
      schema={emailTemplateUpdateSchema}
      defaultValues={{ subject: template.subject, body: template.body }}
      onSubmit={(data) => {
        updateTemplate(template.key, data);
      }}
    >
      {(form) => (
        <Card
          header={
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">{meta.label}</CardTitle>
              <p className="text-xs font-normal text-muted-foreground">{meta.description}</p>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <FormFeilds<EmailTemplateUpdateInput> name="subject" label="Subject" type="text" />
            <FormFeilds<EmailTemplateUpdateInput> name="body" label="Body" type="textarea" className="min-h-60" />
            <FieldDescription>
              Available placeholders: {meta.placeholders.map((p) => `{{${p}}}`).join(", ")}. The
              header (logo + theme color) and footer around this text are fixed and not editable
              here.
            </FieldDescription>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.reset({ subject: meta.defaultSubject, body: meta.defaultBody }, { keepDirty: false })}
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </Button>
              <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                {isLoading ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </FORM>
  );
}

export function EmailTemplatesTab({ initialTemplates }: { initialTemplates: EmailTemplateData[] }) {
  const { data: templates } = useQuery("getEmailTemplates", [], { initialData: initialTemplates });
  const [selectedKey, setSelectedKey] = useState<EmailTemplateKeyValue>(EMAIL_TEMPLATE_KEYS[0]);

  if (!templates) return null;

  const selectedTemplate = templates.find((t) => t.key === selectedKey);

  return (
    <div className="flex flex-col gap-4">
      <Select value={selectedKey} onValueChange={(value) => setSelectedKey(value as EmailTemplateKeyValue)}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue placeholder="Choose an email to edit" />
        </SelectTrigger>
        <SelectContent>
          {EMAIL_TEMPLATE_KEYS.map((key) => (
            <SelectItem key={key} value={key}>
              {EMAIL_TEMPLATES[key].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedTemplate && <EmailTemplateForm key={selectedTemplate.key} template={selectedTemplate} />}
    </div>
  );
}
