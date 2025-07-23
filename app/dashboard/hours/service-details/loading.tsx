export default function Loading() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-700 mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading service hours details...</p>
      </div>
    </div>
  )
}
