import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-label="Yuklanmoqda">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-32" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}
      </div>
    </div>
  );
}
