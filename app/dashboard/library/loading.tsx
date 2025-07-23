// This file should already exist from the previous response.
// It provides a loading skeleton.
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="container mx-auto p-4 space-y-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-6 w-1/4 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
        <CardContent className="border-t pt-4">
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <div className="mt-2">
            <Skeleton className="h-6 w-1/5 mb-2" />
            <Skeleton className="h-10 w-full sm:w-[200px]" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-6 w-6 rounded-full flex-shrink-0 mt-1" />
                    <div className="flex-grow min-w-0">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2 mt-1" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow py-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6 mt-2" />
                  <Skeleton className="h-3 w-1/3 mt-3" />
                </CardContent>
                <CardContent className="flex justify-end gap-2 pt-2 bg-slate-50 dark:bg-slate-800/50 p-3 mt-auto">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
