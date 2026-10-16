import { Skeleton } from "@/components/common/skeleton";

export default function OutstandingFeesLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>
      <div className="space-y-3 rounded-xl border p-4">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-9 w-full max-w-xs" />
        {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
      </div>
    </div>
  );
}
