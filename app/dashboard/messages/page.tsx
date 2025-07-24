"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Send, Paperclip, MoreVertical, ImageIcon, File, X, Plus, Users, ArrowLeft, Trash, MessageSquare } from "lucide-react"
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
import { useTheme } from "@/lib/theme-context"
// import { compressImage } from "@/lib/file-storage"
import { useDebounce, useCleanup } from "@/lib/performance-utils"

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
  const [attachments, setAttachments] = useState<Array<{
    id: string
    name: string
    type: string
    size: number
    url: string
  }>>([])
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

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

  // Get theme-aware button classes
  const getButtonClasses = (variant: "default" | "outline" | "ghost" | "link") => {
    switch (theme) {
      case "original":
        return variant === "default" ? "original-button" : "original-button-outline"
      case "light":
        return variant === "default" ? "light-glass-button" : "light-glass-button-outline"
      case "dark":
      default:
        return variant === "default" ? "glass-button" : "glass-button-outline"
    }
  }

  // Get theme-aware input classes
  const getInputClasses = () => {
    switch (theme) {
      case "original":
        return "original-input"
      case "light":
        return "light-glass-input"
      case "dark":
      default:
        return "glass-input"
    }
  }

  // Get theme-aware dialog classes (solid colors for dark theme to avoid lag)
  const getDialogClasses = () => {
    switch (theme) {
      case "original":
        return "bg-white border border-gray-200 shadow-lg"
      case "light":
        return "bg-white/95 backdrop-blur-sm border border-blue-200/60 shadow-lg"
      case "dark":
      default:
        return "bg-slate-800 border border-slate-700 shadow-lg"
    }
  }

  // Helper function to optimize image URLs for better performance and cost
  const getOptimizedImageUrl = (url: string, width?: number, height?: number) => {
    if (!url) return url
    
    // For production: Use Supabase image transformations
    // This reduces egress costs by serving optimized images
    if (url.includes('supabase.co') && (width || height)) {
      const params = new URLSearchParams()
      if (width) params.append('width', width.toString())
      if (height) params.append('height', height.toString())
      params.append('quality', '80')
      params.append('format', 'webp') // Better compression
      return `${url}?${params.toString()}`
    }
    
    return url
  }

  // Helper function to get thumbnail URL for previews
  const getThumbnailUrl = (url: string) => {
    return getOptimizedImageUrl(url, 150, 150)
  }

  // Helper function to get optimized preview URL
  const getPreviewUrl = (url: string) => {
    return getOptimizedImageUrl(url, 400, 300)
  }

  // Debounced search to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const debouncedNewChatSearch = useDebounce(newChatSearchTerm, 300)

  // Enhanced conversation loading with proper attachment handling
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

          // Convert conversations to our chat format with proper attachment handling
          const formattedChats: Record<string, any[]> = {}

          for (const conversation of processedConversations) {
            const chatId = conversation.id
            const messages = conversation.messages.map((msg: any) => {
              // Handle different attachment formats
              let processedAttachments = []
              
              if (msg.attachments) {
                if (Array.isArray(msg.attachments)) {
                  // Handle array of attachment objects
                  if (msg.attachments.length > 0) {
                    processedAttachments = msg.attachments.map((attachment: any) => ({
                      id: attachment.id || Date.now().toString(),
                      name: attachment.name || 'Attachment',
                      type: attachment.type || 'application/octet-stream',
                      size: attachment.size || 0,
                      url: attachment.url,
                    }))
                  }
                  // If attachments is [], leave processedAttachments as empty array
                } else if (typeof msg.attachments === 'string') {
                  // Handle single URL string (remove @ prefix if present)
                  const url = msg.attachments.startsWith('@') ? msg.attachments.substring(1) : msg.attachments
                  
                  // Determine file type and name from URL
                  const urlParts = url.split('/')
                  const fileName = urlParts[urlParts.length - 1] || 'attachment'
                  const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
                  
                  let fileType = 'application/octet-stream'
                  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
                    fileType = 'image'
                  } else if (['pdf'].includes(fileExtension)) {
                    fileType = 'application/pdf'
                  } else if (['doc', 'docx'].includes(fileExtension)) {
                    fileType = 'application/msword'
                  } else if (['xls', 'xlsx'].includes(fileExtension)) {
                    fileType = 'application/vnd.ms-excel'
                  }
                  
                  processedAttachments = [{
                    id: `attachment_${msg.id}_${Date.now()}`,
                    name: fileName,
                    type: fileType,
                    size: 0, // Size not available from URL
                    url: url,
                  }]
                }
              }
              
              return {
                id: msg.id,
                senderId: msg.sender_id,
                text: msg.text,
                timestamp: msg.created_at,
                reactions: msg.reactions || {},
                attachments: processedAttachments,
              }
            })

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

  // Get current messages for active chat
  const currentMessages = useMemo(() => {
    if (!activeChat || !chats[activeChat]) return []
    return chats[activeChat] || []
  }, [activeChat, chats])

  // Message sending function with proper message type handling
  const handleSendMessage = useCallback(async () => {
    if ((!message.trim() && attachments.length === 0) || !activeChat || !user) return

    try {
      // Upload attachments to Supabase storage first
      const uploadedAttachments: Array<{
        id: string
        name: string
        type: string
        size: number
        url: string
      }> = []
      
      for (const attachment of attachments) {
        try {
          console.log('🔄 Starting upload for attachment:', attachment.name)
          
          // Convert blob URL back to file
          console.log('📥 Fetching blob from URL:', attachment.url)
          const response = await fetch(attachment.url)
          console.log('📦 Response status:', response.status)
          
          const blob = await response.blob()
          console.log('📦 Blob size:', blob.size, 'type:', blob.type)
          
          const file = new File([blob], attachment.name, { type: attachment.type })
          console.log('📁 File created:', file.name, 'size:', file.size, 'type:', file.type)
          
          // Compress image if it's an image
          let processedFile: File = file
          if (attachment.type.startsWith('image/')) {
            try {
              // Temporarily disable compression to fix upload issue
              console.log('Skipping image compression for now to fix upload')
              // const compressedFile = await compressImage(file, {
              //   quality: 0.8,
              //   maxWidth: 1920,
              //   maxHeight: 1920,
              //   format: 'jpeg'
              // })
              // processedFile = compressedFile
            } catch (compressionError) {
              console.warn('Image compression failed, using original:', compressionError)
            }
          }
          
          // Generate unique file path
          const timestamp = Date.now()
          const sanitizedFileName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, "_")
          const filePath = `${user.organizationId}/${timestamp}-${sanitizedFileName}`
          
          // Upload to Supabase storage using direct client approach
          console.log('📤 Preparing direct Supabase upload...')
          
          // Import Supabase client dynamically to avoid constructor issues
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          
          console.log('📤 Uploading directly to Supabase storage...')
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('convo-images')
            .upload(filePath, processedFile, {
              upsert: true,
              cacheControl: 'public, max-age=31536000'
            })
          
          if (uploadError) {
            console.error('❌ Direct upload error:', uploadError)
            throw new Error(`Direct upload failed: ${uploadError.message}`)
          }
          
          console.log('📤 Getting public URL...')
          const { data: publicUrlData } = supabase.storage
            .from('convo-images')
            .getPublicUrl(filePath)
          
          if (!publicUrlData?.publicUrl) {
            throw new Error('Failed to get public URL from direct upload')
          }
          
          const publicUrl = publicUrlData.publicUrl
          console.log('📤 Direct upload successful, URL:', publicUrl)
          
          console.log('✅ Attachment uploaded successfully:', {
            name: attachment.name,
            url: publicUrl,
            size: attachment.size
          })
          
          uploadedAttachments.push({
            id: attachment.id,
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            url: publicUrl
          })
        } catch (uploadError) {
          console.error('Failed to upload attachment:', uploadError)
          toast({
            title: "Upload Error",
            description: `Failed to upload ${attachment.name}`,
            variant: "destructive"
          })
        }
      }

      console.log('📎 Uploaded attachments:', uploadedAttachments)
      
      let messageData

      if (activeChatType === "group") {
        // Group message
        const groupChatId = activeChat.replace("group-", "")
        messageData = {
          sender_id: user.id,
          recipient_id: null, // Group messages don't have a specific recipient
          group_chat_id: groupChatId,
          text: message,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments[0].url : null, // Send just the URL string
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
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments[0].url : null, // Send just the URL string
          reactions: {},
          organization_id: user.organizationId,
        }
      }

      // Save to Supabase
      console.log('Saving message with data:', messageData)
      const savedMessage = await api.createMessage(messageData)
      console.log('Message saved successfully:', savedMessage)

      // Update local state
      const newMessage = {
        id: savedMessage.id,
        senderId: savedMessage.sender_id,
        text: savedMessage.text,
        timestamp: savedMessage.created_at,
        reactions: savedMessage.reactions || {},
        attachments: savedMessage.attachments ? [{
          id: `attachment_${savedMessage.id}_${Date.now()}`,
          name: savedMessage.attachments.split('/').pop() || 'attachment',
          type: savedMessage.attachments.includes('.jpg') || savedMessage.attachments.includes('.jpeg') || savedMessage.attachments.includes('.png') ? 'image' : 'application/octet-stream',
          size: 0,
          url: savedMessage.attachments,
        }] : [],
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
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
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

  const handleImagePreview = useCallback((imageUrl, imageName) => {
    setPreviewImage(imageUrl)
    setShowImagePreview(true)
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
    if (bytes === 0 || bytes === null || bytes === undefined) return "Unknown size"
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

  const handleShowGroupMembers = useCallback(async () => {
    if (!activeChat || activeChatType !== "group" || !user || !mountedRef.current) return

    try {
      const groupChatId = activeChat.replace("group-", "")
      const groupMembersData = await api.getGroupChatMembers(groupChatId)
      if (mountedRef.current) {
        setGroupMembers(groupMembersData)
        setShowGroupMembersDialog(true)
      }
    } catch (error) {
      console.error("Error fetching group members:", error)
      if (mountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to load group members.",
          variant: "destructive",
        })
      }
    }
  }, [activeChat, activeChatType, user, toast])

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
      <div className="flex h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-900">
        {/* Sidebar - Discord style */}
        <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h1 className={`text-xl font-bold ${getTextColor()}`}>Messages</h1>
              <Button
                onClick={() => setShowNewChatDialog(true)}
                className={`${getButtonClasses("default")} h-8 w-8 p-0`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 ${getCardClasses()} border-slate-200 dark:border-slate-700`}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center">
                <p className={`text-sm ${getSecondaryTextColor()}`}>No conversations found</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredConversations.map((conversation) => {
                  const isActive = activeChat === conversation.id
                  const lastMessage = conversation.messages?.[conversation.messages.length - 1]
                  const otherMember = conversation.type === "direct" 
                    ? members.find((m) => m.id === conversation.id)
                    : null

                  return (
                    <div
                      key={conversation.id}
                      onClick={() => {
                        setActiveChat(conversation.id)
                        setActiveChatType(conversation.type)
                      }}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isActive
                          ? "bg-red-500 text-white"
                          : `hover:bg-slate-100 dark:hover:bg-slate-700 ${getCardClasses()}`
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <NextImage
                              src={
                                conversation.type === "group"
                                  ? "/placeholder.svg?height=40&width=40"
                                  : otherMember?.profile_picture || "/placeholder.svg?height=40&width=40"
                              }
                              alt={
                                conversation.type === "group"
                                  ? conversation.groupChat?.name || conversation.name || "Group"
                                  : otherMember?.name || "Unknown"
                              }
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                            <AvatarFallback className="bg-slate-600 text-white">
                              {conversation.type === "group"
                                ? (conversation.groupChat?.name || conversation.name || "G").charAt(0).toUpperCase()
                                : otherMember?.name
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          {onlineUsers.includes(conversation.type === "direct" ? conversation.id : "group") && (
                            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-medium truncate ${isActive ? "text-white" : getTextColor()}`}>
                              {conversation.type === "group"
                                ? conversation.groupChat?.name || conversation.name || "Group Chat"
                                : otherMember?.name || "Unknown User"}
                            </p>
                            {lastMessage && (
                              <span className={`text-xs ${isActive ? "text-white/70" : getMutedTextColor()}`}>
                                {formatDateTime(lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                          {lastMessage && (
                            <p className={`text-sm truncate ${isActive ? "text-white/70" : getSecondaryTextColor()}`}>
                              {lastMessage.text || (lastMessage.attachments?.length > 0 ? "📎 Attachment" : "")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveChat(null)
                      setActiveChatType(null)
                    }}
                    className="md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    <NextImage
                      src={
                        activeChatType === "group"
                          ? "/placeholder.svg?height=32&width=32"
                          : activeConversation?.profile_picture || "/placeholder.svg?height=32&width=32"
                      }
                      alt={
                        activeChatType === "group"
                          ? activeConversation?.groupChat?.name || activeConversation?.name || "Group"
                          : activeConversation?.name || "Unknown"
                      }
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                    <AvatarFallback className="bg-slate-600 text-white">
                      {activeChatType === "group"
                        ? (activeConversation?.groupChat?.name || activeConversation?.name || "G").charAt(0).toUpperCase()
                        : activeConversation?.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 
                      className={`font-semibold ${getTextColor()} ${activeChatType === "group" ? "cursor-pointer hover:underline" : ""}`}
                      onClick={() => {
                        if (activeChatType === "group") {
                          handleShowGroupMembers()
                        }
                      }}
                    >
                      {activeChatType === "group"
                        ? activeConversation?.groupChat?.name || activeConversation?.name || "Group Chat"
                        : getActiveConversationMember()?.name || "Unknown User"}
                    </h2>
                    <p className={`text-sm ${getSecondaryTextColor()}`}>
                      {activeChatType === "group"
                        ? `${activeConversation?.messages?.length || 0} messages`
                        : onlineUsers.includes(activeChat) ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {currentMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className={`text-lg font-medium ${getTextColor()}`}>No messages yet</p>
                      <p className={`text-sm ${getSecondaryTextColor()}`}>Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  currentMessages.map((msg, index) => {
                    const senderMember = members.find((m) => m.id === msg.senderId)
                    const isCurrentUser = msg.senderId === user?.id
                    
                    // Check if we need to show a date banner
                    const currentDate = new Date(msg.timestamp).toDateString()
                    const previousDate = index > 0 ? new Date(currentMessages[index - 1].timestamp).toDateString() : null
                    const showDateBanner = index === 0 || currentDate !== previousDate
                    
                    // Check if we need to show sender info (Discord-style grouping)
                    const previousMessage = index > 0 ? currentMessages[index - 1] : null
                    const timeDiff = previousMessage ? new Date(msg.timestamp).getTime() - new Date(previousMessage.timestamp).getTime() : 0
                    const showSenderInfo = 
                      index === 0 || 
                      msg.senderId !== previousMessage?.senderId || 
                      currentDate !== previousDate ||
                      timeDiff > 5 * 60 * 1000 // 5 minutes

                    return (
                      <div key={msg.id}>
                        {/* Date Banner */}
                        {showDateBanner && (
                          <div className="flex justify-center my-4">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSecondaryTextColor()} bg-slate-100 dark:bg-slate-800`}>
                              {formatDateSeparator(msg.timestamp)}
                            </div>
                          </div>
                        )}
                        
                        <div
                          className={`group hover:bg-slate-50/50 dark:hover:bg-slate-700/50 px-2 py-1 rounded ${showSenderInfo ? "mt-4" : "mt-0.5"}`}
                          onMouseEnter={() => setHoveredMessage(msg.id)}
                          onMouseLeave={() => setHoveredMessage(null)}
                        >
                          <div className="flex gap-3">
                            {/* Avatar - only show for first message in group */}
                            <div className="w-8 lg:w-10 flex-shrink-0">
                              {showSenderInfo && (
                                <Avatar className="w-8 h-8 lg:w-10 lg:h-10">
                                  <NextImage
                                    src={senderMember?.profile_picture || "/placeholder.svg?height=40&width=40"}
                                    alt={senderMember?.name || ""}
                                    width={40}
                                    height={40}
                                    className="rounded-full object-cover"
                                    loading="lazy"
                                  />
                                  <AvatarFallback className="bg-slate-600 text-white">
                                    {senderMember?.name
                                      ?.split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase() || "U"}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Username and timestamp - only show for first message in group */}
                              {showSenderInfo && (
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
                              <div className="space-y-2">
                                {msg.text && (
                                  <div className={`inline-block max-w-[85%] lg:max-w-[70%] ${isCurrentUser ? "ml-auto" : ""}`}>
                                    <p className={`text-sm ${getTextColor()} whitespace-pre-wrap leading-relaxed ${isCurrentUser ? "bg-red-500 text-white rounded-lg px-3 py-2" : "bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2"}`}>
                                      {msg.text}
                                    </p>
                                  </div>
                                )}

                                {msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                                  <div className={`space-y-2 ${isCurrentUser ? "text-right" : ""}`}>
                                    {msg.attachments.map((attachment) => (
                                      <div key={attachment.id} className={`inline-block max-w-[85%] lg:max-w-[70%] rounded border overflow-hidden ${isCurrentUser ? "ml-auto" : ""}`}>
                                        {attachment.type === "image" ? (
                                          <div 
                                            className="cursor-pointer"
                                            onClick={() => handleImagePreview(attachment.url, attachment.name)}
                                          >
                                            <img
                                              src={getThumbnailUrl(attachment.url) || "/placeholder.svg"}
                                              alt={attachment.name}
                                              className="max-w-full max-h-[300px] object-contain hover:opacity-90 transition-opacity"
                                              loading="lazy"
                                              onError={(e) => {
                                                console.error("Failed to load image:", attachment.url)
                                                e.currentTarget.src = "/placeholder.svg"
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <a
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-700"
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

              {/* Message Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className={`w-full resize-none rounded-lg border border-slate-200 dark:border-slate-700 p-3 pr-12 ${getCardClasses()} focus:ring-2 focus:ring-red-500 focus:border-transparent`}
                      rows={1}
                      style={{ minHeight: "44px", maxHeight: "120px" }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-2 bottom-2 h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!message.trim() && attachments.length === 0) || !activeChat}
                    className={`${getButtonClasses("default")} h-10 w-10 p-0`}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 rounded-lg"
                      >
                        {attachment.type === "image" ? (
                          <img
                            src={attachment.url}
                            alt={attachment.name}
                            className="h-8 w-8 object-cover rounded"
                          />
                        ) : (
                          <File className="h-4 w-4" />
                        )}
                        <span className="text-sm truncate max-w-32">{attachment.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(attachment.id)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Welcome Screen */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h2 className={`text-2xl font-bold ${getTextColor()} mb-2`}>Welcome to Messages</h2>
                <p className={`text-sm ${getSecondaryTextColor()} mb-4`}>Select a conversation to start messaging</p>
                <Button onClick={() => setShowNewChatDialog(true)} className={`${getButtonClasses("default")}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Start New Conversation
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt"
        />
      </div>

        {/* Group Members Dialog */}
        <Dialog open={showGroupMembersDialog} onOpenChange={setShowGroupMembersDialog}>
          <DialogContent className={`${getCardClasses()} max-w-md shadow-2xl`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Group Members</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
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
                    <div key={member.id} className={`flex items-center gap-3 p-2 rounded-lg ${theme === "original" ? "bg-gray-100" : theme === "light" ? "bg-blue-50/50" : "bg-slate-700/50"}`}>
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
                          <p className={`font-medium ${getTextColor()}`}>{member.name}</p>
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
                className={getButtonClasses("default")}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Chat Dialog */}
        <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
          <DialogContent className={`max-w-md shadow-2xl ${getCardClasses()}`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Start New Chat</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                Select members to start a conversation. Select multiple for a group chat.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search members..."
                  className={`pl-8 ${getInputClasses()}`}
                  value={newChatSearchTerm}
                  onChange={(e) => setNewChatSearchTerm(e.target.value)}
                />
              </div>

              {selectedMembers.length > 1 && (
                <div>
                                  <Input
                  placeholder="Group chat name..."
                  value={groupChatName}
                  onChange={(e) => setGroupChatName(e.target.value)}
                  className={getInputClasses()}
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
                        className={`flex items-center gap-3 p-3 cursor-pointer rounded-md border ${
                          theme === "dark" 
                            ? "hover:bg-white/10 border-white/20" 
                            : theme === "light" 
                              ? "hover:bg-blue-50 border-blue-200/50" 
                              : "hover:bg-gray-100 border-gray-200"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMembers((prev) => prev.filter((id) => id !== member.id))
                          } else {
                            setSelectedMembers((prev) => [...prev, member.id])
                          }
                        }}
                      >
                        <Checkbox checked={isSelected} readOnly />
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
                            <AvatarFallback>
                              {member.name.split(" ").map((n) => n[0])}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${getTextColor()}`}>{member.name}</p>
                          <p className="text-xs text-green-600 dark:text-green-400">{isOnline ? "Online" : "Offline"}</p>
                        </div>
                      </div>
                    )
                  })}
                {members.filter(
                  (member) =>
                    member.id !== user?.id && member.name.toLowerCase().includes(debouncedNewChatSearch.toLowerCase()),
                ).length === 0 && <div className={`text-center py-4 ${getMutedTextColor()}`}>No members found</div>}
              </div>

              {selectedMembers.length > 0 && (
                <div className={`text-sm ${getSecondaryTextColor()}`}>
                  {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""} selected
                  {selectedMembers.length > 1 && " (Group Chat)"}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewChatDialog(false)} className={getButtonClasses("outline")}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateChat}
                disabled={selectedMembers.length === 0 || (selectedMembers.length > 1 && !groupChatName.trim())}
                className={`${getButtonClasses("default")}`}
              >
                Start Chat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Conversation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className={`max-w-md shadow-2xl ${getCardClasses()}`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Delete Conversation</DialogTitle>
              <DialogDescription className={getSecondaryTextColor()}>
                Are you sure you want to delete this conversation? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className={getButtonClasses("outline")}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConversation} className={getButtonClasses("destructive")}>
                {deletingConversation ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Preview Dialog */}
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
          <DialogContent className={`sm:max-w-[800px] max-h-[90vh] ${getDialogClasses()}`}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center items-center">
              {previewImage && (
                <img
                  src={getPreviewUrl(previewImage)}
                  alt="Preview"
                  className="max-w-full max-h-[70vh] object-contain rounded"
                  onError={(e) => {
                    console.error("Failed to load preview image:", previewImage)
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
    </ThemeWrapper>
  )
}
