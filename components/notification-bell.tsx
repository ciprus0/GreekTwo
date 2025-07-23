"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { notificationManager } from "@/lib/notification-manager"

interface NotificationBellProps {
  userId?: string
  organizationId?: string
  theme?: string
  className?: string
}

export function NotificationBell({ userId, organizationId, theme, className = "" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!userId || !organizationId) return

    const loadNotifications = async () => {
      try {
        const userNotifications = await notificationManager.getNotifications(userId, organizationId)
        setNotifications(userNotifications)
        const unread = userNotifications.filter((n) => !n.read).length
        setUnreadCount(unread)
      } catch (error) {
        console.error("Error loading notifications:", error)
      }
    }

    loadNotifications()

    // Set up polling for new notifications
    const interval = setInterval(loadNotifications, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [userId, organizationId])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationManager.markAsRead(notificationId)
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const getBellColor = () => {
    if (theme === "original" || theme === "light") {
      return "text-gray-700"
    }
    return "text-white"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${getBellColor()} ${className}`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-4">
          <h3 className="font-semibold mb-2">Notifications</h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={`p-2 rounded border cursor-pointer ${notification.read ? "bg-muted/50" : "bg-background"}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
