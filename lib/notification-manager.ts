"use client"

import { cacheManager, getCacheKey } from "@/lib/cache-manager"
import { api } from "@/lib/supabase-api"

export interface Notification {
  id: string
  type: "announcement" | "message" | "event" | "hour_requirement"
  title: string
  message: string
  timestamp: string
  read: boolean
  data?: any
}

class NotificationManager {
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly MAX_NOTIFICATIONS = 50

  async getNotifications(userId: string, organizationId: string): Promise<Notification[]> {
    if (!userId || !organizationId) return []

    const cacheKey = getCacheKey("notifications", userId, organizationId)
    const cached = cacheManager.get<Notification[]>(cacheKey)

    if (cached) {
      return cached
    }

    // Fetch fresh notifications
    const notifications = await this.fetchNotifications(userId, organizationId)
    cacheManager.set(cacheKey, notifications, this.CACHE_TTL)

    return notifications
  }

  private async fetchNotifications(userId: string, organizationId: string): Promise<Notification[]> {
    const notifications: Notification[] = []
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    try {
      // Get user info to check roles
      const user = await api.getMemberById(userId)
      if (!user) return []

      // Get organization to check hour requirements
      const organization = await api.getOrganizationById(organizationId)

      // Fetch recent announcements
      const announcements = await api.getAnnouncementsByOrganization(organizationId)
      const recentAnnouncements = announcements.filter(
        (announcement) => new Date(announcement.created_at) > sevenDaysAgo,
      )

      for (const announcement of recentAnnouncements) {
        notifications.push({
          id: `announcement-${announcement.id}`,
          type: "announcement",
          title: "New Announcement",
          message: `${announcement.title}`,
          timestamp: announcement.created_at,
          read: false,
          data: { announcementId: announcement.id },
        })
      }

      // Fetch recent direct messages to this user
      const conversations = await api.getUserConversations(userId, organizationId)
      for (const conversation of conversations) {
        if (conversation.type === "direct" && conversation.lastMessage) {
          const lastMessage = conversation.lastMessage
          if (
            new Date(lastMessage.created_at) > sevenDaysAgo &&
            lastMessage.sender_id !== userId // Don't notify about own messages
          ) {
            const sender = await api.getMemberBasicInfo(lastMessage.sender_id)
            notifications.push({
              id: `message-${lastMessage.id}`,
              type: "message",
              title: "New Message",
              message: `${sender?.name || "Someone"} sent you a message`,
              timestamp: lastMessage.created_at,
              read: false,
              data: { messageId: lastMessage.id, senderId: lastMessage.sender_id },
            })
          }
        }
      }

      // Fetch recent events
      const events = await api.getEventsByOrganization(organizationId)
      const recentEvents = events.filter((event) => new Date(event.created_at) > sevenDaysAgo)

      for (const event of recentEvents) {
        notifications.push({
          id: `event-${event.id}`,
          type: "event",
          title: "New Event",
          message: `${event.title} - ${new Date(event.start_time).toLocaleDateString()}`,
          timestamp: event.created_at,
          read: false,
          data: { eventId: event.id },
        })
      }

      // Check for new hour requirements that apply to this user
      if (organization?.hour_requirements) {
        for (const requirement of organization.hour_requirements) {
          const requirementDate = new Date(requirement.createdAt)
          if (requirementDate > sevenDaysAgo && requirement.targetUsers.includes(userId)) {
            notifications.push({
              id: `hour-req-${requirement.id}`,
              type: "hour_requirement",
              title: "New Hour Requirement",
              message: `${requirement.name} - ${requirement.hoursRequired} hours required`,
              timestamp: requirement.createdAt,
              read: false,
              data: { requirementId: requirement.id },
            })
          }
        }
      }

      // Sort by timestamp (newest first) and limit
      return notifications
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, this.MAX_NOTIFICATIONS)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      return []
    }
  }

  async markAsRead(userId: string, organizationId: string, notificationId: string): Promise<void> {
    const cacheKey = getCacheKey("notifications", userId, organizationId)
    const notifications = cacheManager.get<Notification[]>(cacheKey)

    if (notifications) {
      const notification = notifications.find((n) => n.id === notificationId)
      if (notification) {
        notification.read = true
        cacheManager.set(cacheKey, notifications, this.CACHE_TTL)
      }
    }

    // Also store read status separately
    const readKey = getCacheKey("notification_read", userId, notificationId)
    cacheManager.set(readKey, true, 24 * 60 * 60 * 1000) // 24 hours
  }

  async markAllAsRead(userId: string, organizationId: string): Promise<void> {
    const cacheKey = getCacheKey("notifications", userId, organizationId)
    const notifications = cacheManager.get<Notification[]>(cacheKey)

    if (notifications) {
      notifications.forEach((notification) => {
        notification.read = true
        const readKey = getCacheKey("notification_read", userId, notification.id)
        cacheManager.set(readKey, true, 24 * 60 * 60 * 1000)
      })
      cacheManager.set(cacheKey, notifications, this.CACHE_TTL)
    }
  }

  getUnreadCount(notifications: Notification[]): number {
    return notifications.filter((n) => !n.read).length
  }

  invalidateCache(userId: string, organizationId: string): void {
    const cacheKey = getCacheKey("notifications", userId, organizationId)
    cacheManager.delete(cacheKey)
  }
}

export const notificationManager = new NotificationManager()
