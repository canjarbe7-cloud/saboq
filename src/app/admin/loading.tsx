import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Yuklanmoqda">
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
