import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-8 lg:p-10 space-y-6 animate-pulse">
      <Skeleton className="h-10 w-1/3 rounded" />
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
          <Skeleton className="h-24 w-full rounded" />
          <div className="space-y-4 p-4 border rounded-md">
            <Skeleton className="h-6 w-1/4 rounded mb-2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

