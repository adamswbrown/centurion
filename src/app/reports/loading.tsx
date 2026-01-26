import { Skeleton } from "@/components/ui/skeleton"

export default function ReportsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Filter controls */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="rounded-lg border p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="h-64 flex items-end gap-2 justify-around">
          {[40, 65, 85, 50, 75, 90, 60, 45, 70, 80, 55, 65].map((h, i) => (
            <Skeleton key={i} className="w-8" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>

      {/* Data table skeleton */}
      <div className="rounded-lg border">
        <div className="p-4 border-b">
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
