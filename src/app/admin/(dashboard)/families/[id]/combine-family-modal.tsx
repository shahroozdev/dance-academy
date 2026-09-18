"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";
import { useRouter } from "@/hooks/useRouter";

export function CombineFamilyModal({ sourceFamilyId, sourceFamilyName }: { sourceFamilyId: string; sourceFamilyName: string }) {
  const router = useRouter();
  const [targetFamilyId, setTargetFamilyId] = useState("");
  const { data: families, isLoading } = useQuery("getFamilies", [{ pageSize: 100, isActive: true, sortBy: "familyName" }]);
  const options = useMemo(() => families?.data
    .filter((family) => family.id !== sourceFamilyId)
    .map((family) => ({ label: `${family.familyName} — ${family.parentGuardianName}${family.email ? ` · ${family.email}` : ""}`, value: family.id })) ?? [], [families, sourceFamilyId]);
  const { mutate: combine, isLoading: isCombining, error } = useMutate("combineFamilies", {
    invalidateKeys: ["getFamilies", "getFamilyById", "getStudents", "getMonthlyBillings"],
    onSuccess: (result) => router.push(`/admin/families/${result.targetFamilyId}`),
  });

  return (
    <Modal trigger={<Button variant="outline">Combine Family</Button>} className="max-w-md" title="Combine Duplicate Family">
      {() => (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Move every student and guardian from {sourceFamilyName} into the selected family. Registration history is retained, unpaid bills are recalculated for sibling discounts, and this duplicate family is removed.
          </p>
          <Input
            type="select"
            value={targetFamilyId}
            onChange={setTargetFamilyId}
            options={options}
            disabled={isLoading}
            placeholder="Select destination family..."
          />
          {Boolean(error) && <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not combine these families."}</p>}
          <Button className="w-full" variant="destructive" disabled={!targetFamilyId || isCombining} onClick={() => combine(sourceFamilyId, targetFamilyId)}>
            {isCombining ? "Combining..." : "Combine and Remove Duplicate"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
