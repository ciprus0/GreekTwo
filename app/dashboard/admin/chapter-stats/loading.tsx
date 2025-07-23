export default function Loading() {
  // Re-using the skeleton component from the page itself
  // Or you can define a simpler one here if preferred.
  // For this example, let's assume the page's skeleton is comprehensive enough.
  // If ChapterStatsPage is imported, this might cause issues with 'use client' boundaries.
  // It's better to define a distinct skeleton here.

  return (
    <div className="container mx-auto p-4 space-y-6 animate-pulse">
      <div className="h-8 w-1/2 bg-gray-300 rounded" />

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-200 p-4 shadow rounded">
            <div className="h-4 w-1/3 bg-gray-300 rounded mb-2" />
            <div className="h-7 w-1/4 bg-gray-300 rounded mb-1" />
            <div className="h-3 w-full bg-gray-300 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-gray-200 p-4 shadow rounded">
        <div className="h-6 w-1/4 bg-gray-300 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-5 w-1/6 bg-gray-300 rounded" />
              <div className="h-5 w-1/3 bg-gray-300 rounded" />
              <div className="h-5 w-1/4 bg-gray-300 rounded" />
              <div className="h-5 w-1/6 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
