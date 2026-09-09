"use client";

import { useParams } from "next/navigation";

import { Badge } from "@/components/common/badge";
import { Button } from "@/components/common/button";
import { Card } from "@/components/common/card";
import { Modal } from "@/components/common/modal";
import { Skeleton } from "@/components/common/skeleton";
import { Link } from "@/components/Link";
import { PageHeader } from "@/components/shared/page-header";
import { useMutate } from "@/hooks/useMutate";
import { useQuery } from "@/hooks/useQuery";

export default function ProgramDetailPage() {
  const id = useParams().id as string;
  const { data: program, isLoading } = useQuery("getProgramById", [id]);
  const { mutate: toggleActive, isLoading: isToggling, error } = useMutate("toggleProgramActive", {
    invalidateKeys: ["getPrograms", "getProgramById", "getActivePrograms"],
  });
  if (isLoading) return <div className="space-y-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-48 w-full" /></div>;
  if (!program) return <div className="py-16 text-center text-muted-foreground">Program not found.</div>;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={program.name} subtitle={program.description || "Dance program"} actions={<div className="flex gap-2">
        <Button variant="outline" asChild><Link href={`/admin/programs/${id}/edit`}>Edit</Link></Button>
        <Modal trigger={<Button variant={program.isActive ? "destructive" : "default"}>{program.isActive ? "Deactivate" : "Activate"}</Button>} title={`${program.isActive ? "Deactivate" : "Activate"} Program?`}>
          {({ close }) => <div className="space-y-4"><p className="text-sm text-muted-foreground">A program with active classes cannot be deactivated.</p>{Boolean(error) && <p role="alert" className="text-sm text-destructive">{error instanceof Error ? error.message : "Could not update the program."}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={close}>Cancel</Button><Button disabled={isToggling} variant={program.isActive ? "destructive" : "default"} onClick={async () => { try { await toggleActive(id, !program.isActive); close(); } catch { /* Error shown above. */ } }}>{isToggling ? "Saving..." : "Confirm"}</Button></div></div>}
        </Modal>
      </div>} />
      <Card header={<div className="flex items-center justify-between"><span className="text-sm font-medium">Classes and Batches</span><Badge variant={program.isActive ? "default" : "secondary"}>{program.isActive ? "Active" : "Inactive"}</Badge></div>} headerClassName="border-b">
        {program.classes.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">No classes yet. Create a class and select this program.</div> : <div className="divide-y">{program.classes.map((item) => <Link key={item.id} href={`/admin/classes/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/50"><div><p className="font-medium">{item.name}</p><p className="text-sm text-muted-foreground">{item.level || "No level"}{item.teacher?.name ? ` · ${item.teacher.name}` : ""}</p></div><div className="text-right"><p className="font-medium">${Number(item.standardRate).toFixed(2)}</p><p className="text-xs text-muted-foreground">{item._count.enrollments} enrolled</p></div></Link>)}</div>}
      </Card>
      <Button className="w-fit" asChild><Link href={`/admin/classes/new?programId=${id}`}>Add Class to Program</Link></Button>
    </div>
  );
}
