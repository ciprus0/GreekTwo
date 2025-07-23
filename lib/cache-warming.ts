import { api } from "./supabase-api"
import { cacheManager } from "./cache-manager"

class CacheWarmingService {
  private isWarming = false

  // Warm cache for a specific organization
  async warmOrganizationCache(organizationId: string): Promise<void> {
    if (this.isWarming) return

    this.isWarming = true
    console.log("🔥 Warming cache for organization:", organizationId)

    try {
      // Warm essential data in parallel
      await Promise.allSettled([
        // Basic organization data
        api.getOrganizationById(organizationId),

        // Member data (basic info first, then full data)
        api.getMembersBasicByOrganization(organizationId),

        // Recent content
        api.getRecentAnnouncementsByOrganization(organizationId, 5),
        api.getUpcomingEventsByOrganization(organizationId, 5),

        // Organization stats
        api.getOrganizationStats?.(organizationId),

        // Library classes for filters
        api.getLibraryClasses?.(organizationId),
      ])

      console.log("✅ Cache warming completed for organization:", organizationId)
    } catch (error) {
      console.error("❌ Cache warming failed:", error)
    } finally {
      this.isWarming = false
    }
  }

  // Warm cache for user-specific data
  async warmUserCache(userId: string, organizationId: string): Promise<void> {
    try {
      await Promise.allSettled([
        // User's own data
        api.getMemberById(userId),
        api.getHoursByUser(userId, organizationId),
        api.getStudySessionsByUser(userId, organizationId),

        // User's conversations (if implemented)
        // api.getUserConversations(userId, organizationId),
      ])

      console.log("✅ User cache warmed for:", userId)
    } catch (error) {
      console.error("❌ User cache warming failed:", error)
    }
  }

  // Warm cache on app startup
  async warmEssentialCache(): Promise<void> {
    try {
      // Get all organizations and warm their basic data
      const organizations = await api.getAllOrganizations()

      // Warm cache for the first few organizations (most active ones)
      const topOrgs = organizations.slice(0, 3)

      for (const org of topOrgs) {
        await this.warmOrganizationCache(org.id)
        // Add small delay to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error("❌ Essential cache warming failed:", error)
    }
  }

  // Get cache warming statistics
  getCacheWarmingStats(): {
    isWarming: boolean
    cacheStats: ReturnType<typeof cacheManager.getStats>
  } {
    return {
      isWarming: this.isWarming,
      cacheStats: cacheManager.getStats(),
    }
  }
}

export const cacheWarmingService = new CacheWarmingService()

// Auto-warm cache on module load (in production)
if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  // Warm cache after a short delay to avoid blocking initial load
  setTimeout(() => {
    cacheWarmingService.warmEssentialCache()
  }, 2000)
}
