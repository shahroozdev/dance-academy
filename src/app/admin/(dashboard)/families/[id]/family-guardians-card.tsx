"use client";

import { familyGuardianSchema, type FamilyGuardianInput } from "@/actions/family-guardians.schema";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { FORM, FormFeilds } from "@/components/common/form";
import { Modal } from "@/components/common/modal";
import { Badge } from "@/components/ui/badge";
import { useMutate } from "@/hooks/useMutate";

type Guardian = {
  id: string;
  name: string;
  relationship: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

export function FamilyGuardiansCard({ familyId, guardians }: { familyId: string; guardians: Guardian[] }) {
  const { mutate: addGuardian, isLoading: isAdding, error: addError } = useMutate("createFamilyGuardian", { invalidateKeys: ["getFamilyById", "getFamilies"] });
  const { mutate: removeGuardian, isLoading: isRemoving, error: removeError } = useMutate("deleteFamilyGuardian", { invalidateKeys: ["getFamilyById", "getFamilies"] });
  const { mutate: updateGuardian, isLoading: isUpdating, error: updateError } = useMutate("updateFamilyGuardian", { invalidateKeys: ["getFamilyById", "getFamilies"] });
  const { mutate: makePrimary, isLoading: isSettingPrimary, error: primaryError } = useMutate("setPrimaryFamilyGuardian", { invalidateKeys: ["getFamilyById", "getFamilies"] });
  const guardianError = removeError ?? primaryError ?? updateError;

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Parents & Guardians ({guardians.length})</span>
          <Modal trigger={<Button size="sm" variant="outline">Add Guardian</Button>} className="max-w-md" title="Add Parent or Guardian">
            {({ close }) => (
              <FORM
                schema={familyGuardianSchema}
                defaultValues={{ name: "", relationship: "", email: "", phone: "" }}
                onSubmit={async (data: FamilyGuardianInput) => { await addGuardian(familyId, data); close(); }}
              >
                {() => (
                  <div className="space-y-4">
                    <FormFeilds name="name" label="Name" required />
                    <FormFeilds name="relationship" label="Relationship" placeholder="Mother, Father, Guardian..." />
                    <FormFeilds name="email" label="Email" type="email" />
                    <FormFeilds name="phone" label="Phone" type="tel" />
                    {Boolean(addError) && <p className="text-sm text-destructive">Could not add this guardian.</p>}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                      <Button type="submit" disabled={isAdding}>{isAdding ? "Saving..." : "Add Guardian"}</Button>
                    </div>
                  </div>
                )}
              </FORM>
            )}
          </Modal>
        </div>
      }
      headerClassName="border-b"
    >
      <div className="divide-y">
        {guardians.map((guardian) => (
          <div key={guardian.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{guardian.name}</p>
                {guardian.isPrimary && <Badge>Primary Billing Contact</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {[guardian.relationship, guardian.email, guardian.phone].filter(Boolean).join(" · ") || "No contact details"}
              </p>
            </div>
            <div className="flex gap-2">
              <Modal trigger={<Button size="sm" variant="outline">Edit</Button>} className="max-w-md" title={`Edit ${guardian.name}`}>
                {({ close }) => (
                  <FORM
                    schema={familyGuardianSchema}
                    defaultValues={{ name: guardian.name, relationship: guardian.relationship ?? "", email: guardian.email ?? "", phone: guardian.phone ?? "" }}
                    onSubmit={async (data: FamilyGuardianInput) => { await updateGuardian(guardian.id, data); close(); }}
                  >
                    {() => (
                      <div className="space-y-4">
                        <FormFeilds name="name" label="Name" required />
                        <FormFeilds name="relationship" label="Relationship" />
                        <FormFeilds name="email" label="Email" type="email" />
                        <FormFeilds name="phone" label="Phone" type="tel" />
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={close}>Cancel</Button>
                          <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Guardian"}</Button>
                        </div>
                      </div>
                    )}
                  </FORM>
                )}
              </Modal>
              {!guardian.isPrimary && (
                <Button size="sm" variant="outline" disabled={isSettingPrimary} onClick={() => makePrimary(guardian.id)}>
                  Make Primary
                </Button>
              )}
              {!guardian.isPrimary && (
                <Button size="sm" variant="destructive" disabled={isRemoving} onClick={() => removeGuardian(guardian.id)}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
        {Boolean(guardianError) && (
          <p className="p-4 text-sm text-destructive">{guardianError instanceof Error ? guardianError.message : "Could not update guardian contacts."}</p>
        )}
      </div>
    </Card>
  );
}
