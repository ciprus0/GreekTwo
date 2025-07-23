"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, Paperclip, MoreVertical, ImageIcon, File, X, Plus, Users } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/supabase-api"
import { useRouter } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import NextImage from "next/image"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useDebounce, useCleanup } from "@/lib/performance-utils"
import { useTheme } from "@/lib/theme-context"

// Emoji picker data
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👌", "✌️", "🤞", "👊", "✊", "🤛", "🤜", "🤟", "👏", "🙌", "👐", "🤲", "🤝", "🙏"],
  },
  {
    name: "Objects",
    emojis: ["❤️", "🔥", "⭐", "🎉", "🎂", "🎁", "📚", "💼", "⚽", "🏆", "🎯", "🎮", "🎧", "📱", "💻", "⌚", "📷"],
  },
  {
    name: "Symbols",
    emojis: ["✅", "❌", "❓", "❗", "❕", "‼️", "⁉️", "💯", "💢", "♥️", "💤", "💫", "💥", "💦", "💨", "🕐", "🚫"],
  },
]

// Common reaction emojis
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "👏", "🔥", "🎉"]

export default function MessagesPage() {
  const { toast } = useToast()
  const router = useRouter()
  const [activeChat, setActiveChat] = useState(null)
  const [activeChatType, setActiveChatType] = useState(null) // 'direct' or 'group'
  const [message, setMessage] = useState("")
  const [user, setUser] = useState(null)
  const [members, setMembers] = useState([])
  const [chats, setChats] = useState({})
  const [searchTerm, setSearchTerm] = useState("")
  const [attachments, setAttachments] = useState([])
  const [reactionMessage, setReactionMessage] = useState(null)
  const [hoveredMessage, setHoveredMessage] = useState(null)
  const [reactionPopoverOpen, setReactionPopoverOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const [onlineUsers, setOnlineUsers] = useState([])
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [newChatSearchTerm, setNewChatSearchTerm] = useState("")
  const [selectedMembers, setSelectedMembers] = useState([])
  const [groupChatName, setGroupChatName] = useState("")
  const [loading, setLoading] = useState(true)
  const [deletingConversation, setDeletingConversation] = useState(false)
  const [conversations, setConversations] = useState([])
  const [showGroupMembersDialog, setShowGroupMembersDialog] = useState(false)
  const [groupMembers, setGroupMembers] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [removingMember, setRemovingMember] = useState(null)
  const mountedRef = useRef(true)

  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getAccentTextColor } = useTextColors()
  const { theme } = useTheme()

  // Get theme-aware card classes
  const getCardClasses = () => {
    switch (theme) {
      case "original":
        return "original-card"
      case "light":
        return "light-glass-card"
      case "dark":
      default:
        return "glass-card border-white/20"
    }
  }

  // Debounced search to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedNewChatSearch = useDebounce(newChatSearchTerm, 300)

  // Load all conversations for the current user
  const loadAllConversations = useCallback(
    async (userId: string, organizationId: string) => {
      if (!mountedRef.current) return

      try {
        const conversationsData = await api.getUserConversations(userId, organizationId)

        // Ensure each conversation has a type property
        const processedConversations = conversationsData.map((conv) => ({
          ...conv,
          type: conv.type || "direct", // Default to 'direct' if type is missing
        }))

        if (mountedRef.current) {
          setConversations(processedConversations)

          // Convert conversations to our chat format
          const formattedChats: Record<string, any[]> = {}

          for (const conversation of processedConversations) {
            const chatId = conversation.id
            const messages = conversation.messages.map((msg: any) => ({
              id: msg.id,
              senderId: msg.sender_id,
              text: msg.text,
              timestamp: msg.created_at,
              reactions: msg.reactions || {},
              attachments: msg.attachments || [],
            }))

            formattedChats[chatId] = messages.sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            )
          }

          setChats(formattedChats)
        }
      } catch (error) {
        console.error("Error loading conversations:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: "Failed to load conversations. Please try again.",
            variant: "destructive",
          })
        }
      }
    },
    [toast],
  )

  // Message sending function with proper message type handling
  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && attachments.length === 0) || !activeChat || !user) return

    try {
      let messageData

      if (activeChatType === "group") {
        // Group message
        const groupChatId = activeChat.replace("group-", "")
        messageData = {
          sender_id: user.id,
          recipient_id: null, // Group messages don't have a specific recipient
          group_chat_id: groupChatId,
          text: message,
          attachments: [...attachments],
          reactions: {},
          organization_id: user.organizationId,
        }
      } else {
        // Direct message - use the other user's ID directly
        messageData = {
          sender_id: user.id,
          recipient_id: activeChat, // This is already the recipient's ID
          group_chat_id: null,
          text: message,
          attachments: [...attachments],
          reactions: {},
          organization_id: user.organizationId,
        }
      }

      // Save to Supabase
      const savedMessage = await api.createMessage(messageData)

      // Update local state
      const newMessage = {
        id: savedMessage.id,
        senderId: savedMessage.sender_id,
        text: savedMessage.text,
        timestamp: savedMessage.created_at,
        reactions: savedMessage.reactions || {},
        attachments: savedMessage.attachments || [],
      }

      // Update chats
      const updatedChats = { ...chats }
      const chatId = activeChat

      if (!updatedChats[chatId]) {
        updatedChats[chatId] = []
      }

      updatedChats[chatId] = [...updatedChats[chatId], newMessage]

      // Save to state
      setChats(updatedChats)

      // Clear input and attachments
      setMessage("")
      setAttachments([])

      // Reload conversations to update the sidebar
      if (mountedRef.current) {
        await loadAllConversations(user.id, user.organizationId)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [message, attachments, activeChat, activeChatType, user, chats, loadAllConversations, toast])

  // Cleanup function
  useCleanup(() => {
    mountedRef.current = false
  })

  useEffect(() => {
    // Load user data
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      // Load members and messages data from Supabase
      loadMembers(parsedUser.organizationId)
    } else {
      // Redirect to login if no user
      router.push("/login")
    }

    // Set up interval to simulate online status changes
    const interval = setInterval(() => {
      if (mountedRef.current) {
        simulateOnlineStatusChanges()
      }
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [router])

  // Load members from Supabase
  const loadMembers = useCallback(
    async (organizationId) => {
      if (!mountedRef.current) return

      try {
        setLoading(true)
        const membersData = await api.getMembersByOrganization(organizationId)
        const approvedMembers = membersData.filter((member) => member.approved)

        if (mountedRef.current) {
          setMembers(approvedMembers)

          // Set some members as online for demo purposes
          const onlineIds = approvedMembers.slice(0, Math.min(3, approvedMembers.length)).map((m) => m.id)
          // Add current user to online users
          const userData = JSON.parse(localStorage.getItem("user"))
          if (userData?.id) {
            onlineIds.push(userData.id)

            // Load all conversations for the current user
            await loadAllConversations(userData.id, organizationId)
          }
          setOnlineUsers([...new Set(onlineIds)])
          setLoading(false)
        }
      } catch (error) {
        console.error("Error loading members:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: "Failed to load members. Please try again.",
            variant: "destructive",
          })
          setLoading(false)
        }
      }
    },
    [loadAllConversations, toast],
  )

  // Simulate random online status changes
  const simulateOnlineStatusChanges = useCallback(() => {
    if (members.length === 0 || !mountedRef.current) return

    // Randomly toggle online status for some members
    const updatedOnlineUsers = [...onlineUsers]

    // Always keep current user online
    if (user && !updatedOnlineUsers.includes(user.id)) {
      updatedOnlineUsers.push(user.id)
    }

    // Randomly add or remove other members
    members.forEach((member) => {
      if (member.id !== user?.id) {
        const isCurrentlyOnline = updatedOnlineUsers.includes(member.id)
        const shouldToggle = Math.random() > 0.7 // 30% chance to toggle

        if (shouldToggle) {
          if (isCurrentlyOnline) {
            const index = updatedOnlineUsers.indexOf(member.id)
            if (index > -1) updatedOnlineUsers.splice(index, 1)
          } else {
            updatedOnlineUsers.push(member.id)
          }
        }
      }
    })

    if (mountedRef.current) {
      setOnlineUsers(updatedOnlineUsers)
    }
  }, [members, onlineUsers, user])

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [activeChat, chats])

  // When activeChat changes, find and set the active conversation
  useEffect(() => {
    if (activeChat && conversations.length > 0) {
      const conversation = conversations.find((conv) => conv.id === activeChat)
      setActiveConversation(conversation || null)
    } else {
      setActiveConversation(null)
    }
  }, [activeChat, conversations])

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage],
  )

  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const newAttachments = files.map((file) => ({
      id: Date.now() + Math.random().toString(36).substring(2, 9),
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : "file",
      size: file.size,
      url: URL.createObjectURL(file),
    }))

    setAttachments((prev) => [...prev, ...newAttachments])

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const removeAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id))
  }, [])

  const handleAddReaction = useCallback(
    async (messageId, emoji) => {
      if (!user || !activeChat || !mountedRef.current) return

      // Create a unique chat ID
      const chatId = activeChat

      // Update chats - create a deep copy to avoid mutation
      const updatedChats = { ...chats }

      if (!updatedChats[chatId]) {
        updatedChats[chatId] = []
      }

      // Create a new array to avoid direct mutation
      updatedChats[chatId] = [...updatedChats[chatId]]

      // Find the message
      const messageIndex = updatedChats[chatId].findIndex((msg) => msg.id === messageId)
      if (messageIndex === -1) return

      // Create a new message object to avoid mutation
      const message = { ...updatedChats[chatId][messageIndex] }

      // Initialize reactions if they don't exist
      if (!message.reactions) {
        message.reactions = {}
      } else {
        // Create a copy of reactions to avoid mutation
        message.reactions = { ...message.reactions }
      }

      // Update reactions
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = [user.id]
      } else {
        // Create a copy of the emoji array
        const currentReactions = [...message.reactions[emoji]]

        // Toggle reaction
        const userIndex = currentReactions.indexOf(user.id)
        if (userIndex === -1) {
          message.reactions[emoji] = [...currentReactions, user.id]
        } else {
          message.reactions[emoji] = currentReactions.filter((id) => id !== user.id)
          // Remove empty reaction arrays
          if (message.reactions[emoji].length === 0) {
            delete message.reactions[emoji]
          }
        }
      }

      // Update the message in the array
      updatedChats[chatId][messageIndex] = message

      // Save to state
      if (mountedRef.current) {
        setChats(updatedChats)
      }

      // Update in Supabase
      try {
        // Update the message in Supabase
        await api.updateMessage(messageId, {
          reactions: message.reactions,
        })
      } catch (error) {
        console.error("Error updating message reaction:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: "Failed to update reaction. Please try again.",
            variant: "destructive",
          })
        }
      }
    },
    [user, activeChat, chats, toast],
  )

  const handleDeleteConversation = useCallback(async () => {
    if (!activeChat || !user || !mountedRef.current) return

    try {
      setDeletingConversation(true)

      if (activeChatType === "group") {
        // Delete group chat and all related data
        const groupChatId = activeChat.replace("group-", "")
        await api.deleteGroupChat(groupChatId)
      } else {
        // Delete direct conversation messages
        await api.deleteDirectConversation(user.id, activeChat, user.organizationId)
      }

      // Remove conversation from local state
      const chatId = activeChat
      const updatedChats = { ...chats }
      delete updatedChats[chatId]

      if (mountedRef.current) {
        setChats(updatedChats)

        // Clear active chat
        setActiveChat(null)
        setActiveChatType(null)

        // Reload conversations to update the sidebar
        await loadAllConversations(user.id, user.organizationId)

        toast({
          title: "Success",
          description: "Conversation deleted successfully.",
        })
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to delete conversation. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      if (mountedRef.current) {
        setDeletingConversation(false)
      }
    }
  }, [activeChat, activeChatType, user, chats, loadAllConversations, toast])

  const handleCreateChat = useCallback(async () => {
    if (!user || !mountedRef.current) return

    try {
      if (selectedMembers.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one member.",
          variant: "destructive",
        })
        return
      }

      if (selectedMembers.length === 1) {
        // Direct chat
        const memberId = selectedMembers[0]
        setActiveChat(memberId)
        setActiveChatType("direct")
        setShowNewChatDialog(false)
        setSelectedMembers([])
        setGroupChatName("")
        setNewChatSearchTerm("")
      } else {
        // Group chat
        if (!groupChatName.trim()) {
          toast({
            title: "Error",
            description: "Please enter a group chat name.",
            variant: "destructive",
          })
          return
        }

        // Create group chat
        const groupChat = await api.createGroupChat({
          name: groupChatName.trim(),
          organizationId: user.organizationId,
          createdBy: user.id,
          memberIds: [...selectedMembers, user.id], // Include current user
        })

        // Set as active chat
        setActiveChat(`group-${groupChat.id}`)
        setActiveChatType("group")

        // Reload conversations
        await loadAllConversations(user.id, user.organizationId)

        toast({
          title: "Success",
          description: `Group chat "${groupChatName}" created successfully.`,
        })

        // Reset form
        setShowNewChatDialog(false)
        setSelectedMembers([])
        setGroupChatName("")
        setNewChatSearchTerm("")
      }
    } catch (error) {
      console.error("Error creating chat:", error)
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to create chat. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [user, selectedMembers, groupChatName, loadAllConversations, toast])

  const getMessages = useCallback(
    (chatId) => {
      if (!user || !chatId) return []
      return chats[chatId] || []
    },
    [user, chats],
  )

  const getLastMessage = useCallback((conversation) => {
    return conversation.lastMessage || null
  }, [])

  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return ""

    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }, [])

  const formatDateTime = useCallback((timestamp) => {
    if (!timestamp) return ""

    const date = new Date(timestamp)
    return (
      date.toLocaleDateString([], {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    )
  }, [])

  const formatDateSeparator = useCallback((timestamp) => {
    if (!timestamp) return ""

    const date = new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    }
  }, [])

  const formatDate = useCallback(
    (timestamp) => {
      if (!timestamp) return ""

      const date = new Date(timestamp)
      const now = new Date()

      // If today, return time
      if (date.toDateString() === now.toDateString()) {
        return formatTime(timestamp)
      }

      // If yesterday
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday"
      }

      // Otherwise return date
      return date.toLocaleDateString()
    },
    [formatTime],
  )

  const formatFileSize = useCallback((bytes) => {
    if (bytes < 1024) return bytes + " B"
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    else return (bytes / 1048576).toFixed(1) + " MB"
  }, [])

  // Group messages by date and check if we need to show sender info
  const groupMessagesByDate = useCallback((messages) => {
    const grouped = []
    let currentDate = null
    let lastSenderId = null
    let lastMessageTime = null

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.timestamp).toDateString()
      const msgTime = new Date(msg.timestamp).getTime()
      const timeDiff = lastMessageTime ? msgTime - lastMessageTime : 0
      const showSenderInfo =
        msg.senderId !== lastSenderId ||
        timeDiff > 5 * 60 * 1000 || // 5 minutes
        msgDate !== currentDate

      // Add date separator if date changed
      if (msgDate !== currentDate) {
        grouped.push({
          type: "date-separator",
          date: msg.timestamp,
          id: `date-${msgDate}`,
        })
        currentDate = msgDate
      }

      grouped.push({
        ...msg,
        type: "message",
        showSenderInfo,
      })

      lastSenderId = msg.senderId
      lastMessageTime = msgTime
    })

    return grouped
  }, [])

  const getConversationName = useCallback(
    (conversation) => {
      if (!conversation || !user) return "Unknown"

      if (conversation.type === "group") {
        return conversation.groupChat?.name || "Group Chat"
      } else {
        // Direct message - find the other participant
        const otherUserId = conversation.participants?.find((id) => id !== user?.id)
        const otherUser = members.find((m) => m.id === otherUserId)
        return otherUser?.name || "Unknown User"
      }
    },
    [user, members],
  )

  const getConversationAvatar = useCallback(
    (conversation) => {
      if (!conversation || !user) return null

      if (conversation.type === "group") {
        return null // We'll show a group icon
      } else {
        // Direct message - find the other participant
        const otherUserId = conversation.participants?.find((id) => id !== user?.id)
        const otherUser = members.find((m) => m.id === otherUserId)
        return otherUser?.profile_picture
      }
    },
    [user, members],
  )

  const getActiveConversationMember = useCallback(() => {
    if (!activeChat || !user || activeChatType !== "direct") return null
    return members.find((m) => m.id === activeChat)
  }, [activeChat, user, activeChatType, members])

  // Filter conversations based on search with debouncing
  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const name = getConversationName(conversation).toLowerCase()
      return name.includes(debouncedSearchTerm.toLowerCase())
    })
  }, [conversations, debouncedSearchTerm, getConversationName])

  const loadGroupMembers = useCallback(
    async (groupChatId) => {
      if (!groupChatId || !groupChatId.startsWith("group-") || !mountedRef.current) return

      try {
        const actualGroupId = groupChatId.replace("group-", "")
        const members = await api.getGroupChatMembers(actualGroupId)
        if (mountedRef.current) {
          setGroupMembers(members)
        }
      } catch (error) {
        console.error("Error loading group members:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: "Failed to load group members.",
            variant: "destructive",
          })
        }
      }
    },
    [toast],
  )

  useEffect(() => {
    if (activeChat && activeChatType === "group") {
      loadGroupMembers(activeChat)
    }
  }, [activeChat, activeChatType, loadGroupMembers])

  const handleRemoveGroupMember = useCallback(
    async (memberId: string) => {
      if (!activeChat || !activeChatType === "group" || !user || !mountedRef.current) return

      try {
        setRemovingMember(memberId)

        const groupChatId = activeChat.replace("group-", "")
        await api.removeGroupChatMember(groupChatId, memberId)

        // Update local group members state
        if (mountedRef.current) {
          setGroupMembers((prev) => prev.filter((member) => member.id !== memberId))

          // Reload conversations to update the sidebar
          await loadAllConversations(user.id, user.organizationId)

          toast({
            title: "Success",
            description: "Member removed from group chat.",
          })
        }
      } catch (error) {
        console.error("Error removing group member:", error)
        if (mountedRef.current) {
          toast({
            title: "Error",
            description: "Failed to remove member. Please try again.",
            variant: "destructive",
          })
        }
      } finally {
        if (mountedRef.current) {
          setRemovingMember(null)
        }
      }
    },
    [activeChat, activeChatType, user, loadAllConversations, toast],
  )

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Messages</h1>
          <p className={`text-muted-foreground ${getMutedTextColor()}`}>Communicate with your chapter members.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[calc(100vh-220px)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-700 mx-auto mb-4"></div>
              <p className={`${getSecondaryTextColor()}`}>Loading messages...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
            <div className={`lg:col-span-1 ${getCardClasses()} overflow-hidden`}>
              <div className="p-4 border-b flex items-center justify-between">
                <div className="relative flex-1 mr-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="search"
                    placeholder="Search messages..."
                    className="glass-input pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button size="sm" className="glass-button" onClick={() => setShowNewChatDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="overflow-y-auto h-[calc(100%-65px)]">
                {filteredConversations.length === 0 ? (
                  <div className={`p-4 text-center ${getMutedTextColor()}`}>
                    <p>No conversations yet</p>
                    <p className="text-xs mt-1">Start a new conversation to see it here</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const lastMessage = getLastMessage(conversation)
                    const hasUnread = lastMessage && lastMessage.senderId !== user?.id && !lastMessage.read
                    const isGroup = conversation.type === "group"
                    const conversationName = getConversationName(conversation)
                    const avatarSrc = getConversationAvatar(conversation)

                    return (
                      <div
                        key={conversation.id}
                        className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors ${activeChat === conversation.id ? "bg-red-500/10 border-r-2 border-red-500" : ""}`}
                        onClick={() => {
                          setActiveChat(conversation.id)
                          setActiveChatType(conversation.type || "direct")
                        }}
                      >
                        <div className="relative">
                          {isGroup ? (
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-slate-600" />
                            </div>
                          ) : (
                            <Avatar>
                              <NextImage
                                src={avatarSrc || "/placeholder.svg?height=40&width=40"}
                                alt={conversationName}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                                loading="lazy"
                              />
                              <AvatarFallback>
                                {conversationName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {!isGroup && conversation.participants && (
                            <>
                              {onlineUsers.includes(conversation.participants.find((id) => id !== user?.id)) && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium flex items-center gap-1 ${getTextColor()}`}>
                              {conversationName}
                              {isGroup && <Users className="h-3 w-3 text-slate-500" />}
                            </p>
                            <p className={`text-xs ${getMutedTextColor()}`}>
                              {lastMessage ? formatDate(lastMessage.timestamp) : ""}
                            </p>
                          </div>
                          <p className={`text-sm ${getSecondaryTextColor()} truncate`}>
                            {lastMessage
                              ? (lastMessage.attachments && lastMessage.attachments.length > 0)
                                ? `${lastMessage.attachments.length} attachment${lastMessage.attachments.length > 1 ? "s" : ""}${lastMessage.text ? `: ${lastMessage.text}` : ""}`
                                : lastMessage.text
                              : "No messages yet"}
                          </p>
                        </div>
                        {hasUnread && <div className="w-2 h-2 bg-rose-700 rounded-full"></div>}
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className={`lg:col-span-2 ${getCardClasses()} overflow-hidden flex flex-col`}>
              {activeChat ? (
                <>
                  <div className="p-4 border-b flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => {
                        if (activeChatType === "group") {
                          setShowGroupMembersDialog(true)
                        }
                      }}
                    >
                      {activeChatType === "group" ? (
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-slate-600" />
                        </div>
                      ) : (
                        <Avatar>
                          {getActiveConversationMember() ? (
                            <>
                              <NextImage
                                src={
                                  getActiveConversationMember()?.profile_picture ||
                                  "/placeholder.svg?height=40&width=40"
                                }
                                alt={getActiveConversationMember()?.name || ""}
                                width={40}
                                height={40}
                                className="rounded-full object-cover"
                                loading="lazy"
                              />
                              <AvatarFallback>
                                {getActiveConversationMember()
                                  ?.name?.split(" ")
                                  .map((n) => n[0])
                                  .join("") || ""}
                              </AvatarFallback>
                            </>
                          ) : (
                            <>
                              <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Unknown" />
                              <AvatarFallback>??</AvatarFallback>
                            </>
                          )}
                        </Avatar>
                      )}
                      <div>
                        <p className={`font-medium flex items-center gap-1 ${getTextColor()}`}>
                          {activeChatType === "group"
                            ? activeConversation?.groupChat?.name || "Group Chat"
                            : getActiveConversationMember()?.name || "Unknown User"}
                          {activeChatType === "group" && <Users className="h-3 w-3 text-slate-500 ml-1" />}
                        </p>
                        {activeChatType === "direct" && (
                          <p className="text-xs text-green-600">
                            {onlineUsers.includes(activeChat) ? "Online" : "Offline"}
                          </p>
                        )}
                        {activeChatType === "group" && user?.id === activeConversation?.groupChat?.created_by && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setShowGroupMembersDialog(true)}
                          >
                            Manage Members
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={handleDeleteConversation}
                            disabled={deletingConversation}
                            className="text-red-600 focus:text-red-600"
                          >
                            {deletingConversation ? "Deleting..." : "Delete Conversation"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {getMessages(activeChat).length === 0 ? (
                      <div className={`h-full flex items-center justify-center ${getMutedTextColor()}`}>
                        <p>No messages yet. Start a conversation!</p>
                      </div>
                    ) : (
                      groupMessagesByDate(getMessages(activeChat)).map((item) => {
                        if (item.type === "date-separator") {
                          return (
                            <div key={item.id} className="flex justify-center my-4">
                              <div className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full">
                                {formatDateSeparator(item.date)}
                              </div>
                            </div>
                          )
                        }

                        const msg = item
                        const isCurrentUser = msg.senderId === user?.id
                        let senderMember = isCurrentUser ? user : null

                        if (!isCurrentUser) {
                          if (activeChatType === "group") {
                            senderMember = members.find((m) => m.id === msg.senderId)
                          } else {
                            senderMember = members.find((m) => m.id === activeChat)
                          }
                        }

                        return (
                          <div
                            key={msg.id}
                            className={`group hover:bg-slate-50/50 px-2 py-1 rounded ${msg.showSenderInfo ? "mt-4" : "mt-0.5"}`}
                            onMouseEnter={() => setHoveredMessage(msg.id)}
                            onMouseLeave={() => setHoveredMessage(null)}
                          >
                            <div className="flex gap-3">
                              {/* Avatar - only show for first message in group */}
                              <div className="w-10 flex-shrink-0">
                                {msg.showSenderInfo && (
                                  <Avatar className="w-10 h-10">
                                    <NextImage
                                      src={senderMember?.profile_picture || "/placeholder.svg?height=40&width=40"}
                                      alt={senderMember?.name || ""}
                                      width={40}
                                      height={40}
                                      className="rounded-full object-cover"
                                      loading="lazy"
                                    />
                                    <AvatarFallback>
                                      {senderMember?.name
                                        ?.split(" ")
                                        .map((n) => n[0])
                                        .join("") || ""}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Username and timestamp - only show for first message in group */}
                                {msg.showSenderInfo && (
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className={`font-medium text-sm ${getTextColor()}`}>
                                      {senderMember?.name || "Unknown User"}
                                    </span>
                                    <span className={`text-xs ${getMutedTextColor()}`}>
                                      {formatDateTime(msg.timestamp)}
                                    </span>
                                  </div>
                                )}

                                {/* Message content */}
                                <div className="space-y-1">
                                  {msg.text && (
                                    <p className={`text-sm ${getTextColor()} whitespace-pre-wrap leading-relaxed`}>
                                      {msg.text}
                                    </p>
                                  )}

                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="space-y-2">
                                      {msg.attachments.map((attachment) => (
                                        <div key={attachment.id} className="rounded border overflow-hidden max-w-md">
                                          {attachment.type === "image" ? (
                                            <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                                              <img
                                                src={attachment.url || "/placeholder.svg"}
                                                alt={attachment.name}
                                                className="max-w-full max-h-[300px] object-contain"
                                              />
                                            </a>
                                          ) : (
                                            <a
                                              href={attachment.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 p-3 hover:bg-slate-50"
                                            >
                                              <File className="h-4 w-4" />
                                              <span className="text-sm">{attachment.name}</span>
                                              <span className="text-xs text-slate-500">({formatFileSize(attachment.size)})</span>
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Reactions */}
                                  <div className="flex flex-wrap items-center gap-1 mt-1">
                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                      <>
                                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                                          <TooltipProvider key={emoji}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Badge
                                                  variant="outline"
                                                  className={`px-2 py-0.5 cursor-pointer hover:bg-slate-100 ${
                                                    users.includes(user?.id) ? "bg-rose-50 border-rose-200" : ""
                                                  }`}
                                                  onClick={() => handleAddReaction(msg.id, emoji)}
                                                >
                                                  {emoji} {users.length}
                                                </Badge>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  {users
                                                    .map((userId) => {
                                                      const reactUser =
                                                        userId === user?.id
                                                          ? "You"
                                                          : members.find((m) => m.id === userId)?.name || "Unknown"
                                                      return reactUser
                                                    })
                                                    .join(", ")}
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        ))}
                                      </>
                                    )}

                                    {/* Add Reaction Button */}
                                    {(hoveredMessage === msg.id || reactionMessage === msg.id) && (
                                      <Popover
                                        open={reactionMessage === msg.id}
                                        onOpenChange={(open) => {
                                          if (open) {
                                            setReactionMessage(msg.id)
                                          } else {
                                            setReactionMessage(null)
                                          }
                                        }}
                                      >
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity"
                                            onClick={() => setReactionMessage(msg.id)}
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80 p-4" align="start">
                                          <div className="space-y-3">
                                            <div className="flex flex-wrap gap-1">
                                              {QUICK_REACTIONS.map((emoji) => (
                                                <Button
                                                  key={emoji}
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-8 w-8 p-0"
                                                  onClick={() => {
                                                    handleAddReaction(msg.id, emoji)
                                                    setReactionMessage(null)
                                                  }}
                                                >
                                                  {emoji}
                                                </Button>
                                              ))}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Input
                                                placeholder="Type any emoji..."
                                                className="glass-input flex-1"
                                                onKeyPress={(e) => {
                                                  if (e.key === "Enter" && e.target.value.trim()) {
                                                    handleAddReaction(msg.id, e.target.value.trim())
                                                    e.target.value = ""
                                                    setReactionMessage(null)
                                                  }
                                                }}
                                              />
                                              <Button
                                                size="sm"
                                                onClick={() => {
                                                  // Open native emoji picker if supported
                                                  if (navigator.userAgent.includes("Windows")) {
                                                    // Windows emoji picker shortcut
                                                    document.dispatchEvent(
                                                      new KeyboardEvent("keydown", {
                                                        key: ".",
                                                        code: "Period",
                                                        metaKey: true,
                                                      }),
                                                    )
                                                  }
                                                }}
                                              >
                                                😀
                                              </Button>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t">
                    {/* Attachment preview */}
                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {attachments.map((attachment) => (
                          <div key={attachment.id} className="relative group">
                            <div className="border rounded p-1 bg-slate-50">
                              {attachment.type === "image" ? (
                                <div className="relative w-16 h-16">
                                  <img
                                    src={attachment.url || "/placeholder.svg"}
                                    alt={attachment.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 flex items-center justify-center">
                                  <File className="h-8 w-8 text-slate-400" />
                                </div>
                              )}
                            </div>
                            <button
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removeAttachment(attachment.id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple />
                      <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = "image/*"
                            fileInputRef.current.click()
                          }
                        }}
                      >
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <div className="relative flex-1">
                        <textarea
                          placeholder="Type a message..."
                          className={`glass-input w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px] resize-none ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                        />
                      </div>
                      <Button
                        size="icon"
                        className="glass-button"
                        onClick={handleSendMessage}
                        disabled={!message.trim() && attachments.length === 0}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={`h-full flex items-center justify-center ${getMutedTextColor()} p-4 text-center`}>
                  <div>
                    <p className="mb-2">Select a conversation to start messaging</p>
                    <p className="text-sm">Or search for a member to start a new conversation</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Group Members Dialog */}
        <Dialog open={showGroupMembersDialog} onOpenChange={setShowGroupMembersDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Group Members</DialogTitle>
              <DialogDescription className="text-slate-300">
                {activeConversation?.groupChat?.name || "Group Chat"} • {groupMembers.length} members
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 py-4">
                {groupMembers.map((member) => {
                  const isOnline = onlineUsers.includes(member.id)
                  const isCreator = activeConversation?.groupChat?.created_by === member.id
                  const isCurrentUser = member.id === user?.id
                  const canRemove =
                    user?.id === activeConversation?.groupChat?.created_by && !isCurrentUser && !isCreator

                  return (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/50">
                      <div className="relative">
                        <Avatar>
                          <NextImage
                            src={member.profile_picture || "/placeholder.svg?height=40&width=40"}
                            alt={member.name}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                            loading="lazy"
                          />
                          <AvatarFallback className="bg-slate-600 text-white">
                            {member.name.split(" ").map((n) => n[0])}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{member.name}</p>
                          {isCreator && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-400">
                              Creator
                            </Badge>
                          )}
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-green-400">{isOnline ? "Online" : "Offline"}</p>
                      </div>
                      {canRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 border border-red-500/30"
                          onClick={() => handleRemoveGroupMember(member.id)}
                          disabled={removingMember === member.id}
                        >
                          {removingMember === member.id ? "Removing..." : "Remove"}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button
                onClick={() => setShowGroupMembersDialog(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Chat Dialog */}
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Start New Chat</DialogTitle>
              <DialogDescription className="text-slate-300">
                Select members to start a conversation. Select multiple for a group chat.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search members..."
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pl-8"
                  value={newChatSearchTerm}
                  onChange={(e) => setNewChatSearchTerm(e.target.value)}
                />
              </div>

              {selectedMembers.length > 1 && (
                <div>
                  <Input
                    placeholder="Group chat name..."
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                    value={groupChatName}
                    onChange={(e) => setGroupChatName(e.target.value)}
                  />
                </div>
              )}

              <div className="max-h-60 overflow-y-auto space-y-2">
                {members
                  .filter(
                    (member) =>
                      member.id !== user?.id &&
                      member.name.toLowerCase().includes(debouncedNewChatSearch.toLowerCase()),
                  )
                  .map((member) => {
                    const isOnline = onlineUsers.includes(member.id)
                    const isSelected = selectedMembers.includes(member.id)

                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-700/50 rounded-md border border-slate-600/50 bg-slate-700/30"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMembers((prev) => prev.filter((id) => id !== member.id))
                          } else {
                            setSelectedMembers((prev) => [...prev, member.id])
                          }
                        }}
                      >
                        <Checkbox checked={isSelected} readOnly className="border-slate-500" />
                        <div className="relative">
                          <Avatar>
                            <NextImage
                              src={member.profile_picture || "/placeholder.svg?height=32&width=32"}
                              alt={member.name}
                              width={32}
                              height={32}
                              className="rounded-full object-cover"
                              loading="lazy"
                            />
                            <AvatarFallback className="bg-slate-600 text-white">
                              {member.name.split(" ").map((n) => n[0])}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{member.name}</p>
                          <p className="text-xs text-green-400">{isOnline ? "Online" : "Offline"}</p>
                        </div>
                      </div>
                    )
                  })}
                {members.filter(
                  (member) =>
                    member.id !== user?.id && member.name.toLowerCase().includes(debouncedNewChatSearch.toLowerCase()),
                ).length === 0 && <div className="text-center py-4 text-slate-400">No members found</div>}
              </div>

              {selectedMembers.length > 0 && (
                <div className="text-sm text-slate-300">
                  {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""} selected
                  {selectedMembers.length > 1 && " (Group Chat)"}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="bg-transparent border-slate-600 text-white hover:bg-slate-700"
                onClick={() => {
                  setShowNewChatDialog(false)
                  setSelectedMembers([])
                  setGroupChatName("")
                  setNewChatSearchTerm("")
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateChat}
                disabled={selectedMembers.length === 0 || (selectedMembers.length > 1 && !groupChatName.trim())}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {selectedMembers.length > 1 ? "Create Group" : "Start Chat"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ThemeWrapper>
  )
}
