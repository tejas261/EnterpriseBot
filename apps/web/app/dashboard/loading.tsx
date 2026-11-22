import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-7 lg:px-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-64" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="mt-6 h-12 w-40" />
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}
