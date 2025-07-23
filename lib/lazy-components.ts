// Lazy loading for heavy components
import { lazy } from "react"

// Lazy load heavy dashboard components
export const LazyHoursPage = lazy(() => import("@/app/dashboard/hours/page"))
export const LazyEventsPage = lazy(() => import("@/app/dashboard/events/page"))
export const LazyMessagesPage = lazy(() => import("@/app/dashboard/messages/page"))
export const LazyStudyPage = lazy(() => import("@/app/dashboard/study/page"))
export const LazyLibraryPage = lazy(() => import("@/app/dashboard/library/page"))
export const LazyMembersPage = lazy(() => import("@/app/dashboard/members/page"))

// Lazy load map component (heavy dependency)
export const LazyMapComponent = lazy(() => import("@/components/map-component"))

// Loading component for lazy loaded components
export function ComponentLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-700"></div>
    </div>
  )
}
