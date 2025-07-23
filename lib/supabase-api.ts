import { supabase } from "@/lib/supabase/client"
import { compressImage, uploadToStorage } from "@/lib/file-storage"
import {
  cacheManager,
  getCacheKey,
  withCache,
  invalidateOrganizationCache,
  invalidateUserCache,
  getCache,
  setCache,
} from "@/lib/cache-manager"

// Types
export interface Organization {
  id: string
  group_id: string
  name: string
  type: string
  university: string
  chapter_designation: string
  is_colony: boolean
  founded_year: string
  created_at: string
  created_by?: string
  roles: Array<{
    id: string
    name: string
    isDefault: boolean
    color: string
    isAdmin: boolean
  }>
  hour_requirements?: Array<{
    id: string
    type: string
    name: string
    description: string
    hoursRequired: number
    targetUsers: string[]
    createdBy: string
    createdAt: string
  }>
  features: {
    events: boolean
    study: boolean
    tasks: boolean
    library: boolean
    messages: boolean
    announcements: boolean
    pledgeSystem: boolean
  }
}

export interface Member {
  id: string
  name: string
  email: string
  password_hash: string
  organization_id: string
  chapter: string
  university: string
  organization_type: string
  roles: string[] // Only using roles array now
  approved: boolean
  join_date: string
  profile_picture?: string
  password?: string // Added for updates, will be hashed
  is_new_member?: boolean // Added for new member status
  pledge?: boolean // Added for pledge status
  phone_number?: string // Added phone number field
  major?: string // Added major field
}

export interface Event {
  id: string
  title: string
  description?: string
  type?: string
  location: string
  start_time: string
  end_time: string
  created_by: string
  organization_id: string
  created_at: string
  updated_at: string
  images?: any[]
}

export interface EventAttendee {
  id: string
  event_id: string
  member_id: string
  status: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  category: string
  author_id: string
  author_name: string
  author_profile_picture?: string
  organization_id: string
  created_at: string
}

export interface GroupChat {
  id: string
  name: string
  organization_id: string
  created_by: string
  created_at: string
  members?: Member[]
  member_count?: number
}

export interface GroupChatMember {
  id: string
  group_chat_id: string
  member_id: string
  joined_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id?: string // null for group messages
  group_chat_id?: string // null for direct messages
  text: string
  attachments: Array<{
    id: string
    name: string
    type: string
    size: number
    url: string
  }>
  reactions: Record<string, string[]>
  organization_id: string
  created_at: string
}

export interface StudySession {
  id: string
  user_id: string
  location_id: string // Keep this, as it's the FK
  location_name?: string // This will be manually populated or shown as unknown
  start_time: string
  end_time?: string
  duration?: number
  organization_id: string
  status: "active" | "completed" | "paused"
  created_at: string
  // Removed 'location' and 'user' direct join properties for now
  userName?: string // For display
}

export interface StudyLocation {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  radius?: number
  is_box?: boolean
  box_coordinates?: {
    nw: { lat: number; lng: number }
    se: { lat: number; lng: number }
  }
  organization_id: string
  created_by: string
  created_at: string
}

export interface Hour {
  id: string
  user_id: string
  user_name: string
  type: string
  date: string
  hours: number
  description: string
  status: string
  organization_id: string
  added_by?: string
  added_by_admin?: boolean
  created_at: string
}

export interface LibraryFile {
  id: string
  file_name: string
  display_name: string
  description: string | null
  file_url: string
  file_type: string
  file_size: number
  category: string
  created_at: string
  storage_path: string
  item_type: string
  class_name?: string
  document_type?: string
  composite_type?: string
  composite_year?: string
}

export interface GymSession {
  id: string
  user_id: string
  location_id: string // Keep this, as it's the FK
  location_name?: string // This will be manually populated or shown as unknown
  start_time: string
  end_time?: string
  duration?: number
  organization_id: string
  status: "active" | "completed" | "paused"
  created_at: string
  // Removed 'location' and 'user' direct join properties for now
  userName?: string // For display
}

export interface GymLocation {
  id: string
  name: string
  address?: string
  lat: number
  lng: number
  radius?: number
  is_box?: boolean
  box_coordinates?: {
    nw: { lat: number; lng: number }
    se: { lat: number; lng: number }
  }
  organization_id: string
  created_by: string
  created_at: string
}

// Password hashing utility
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

// Production-level API with comprehensive caching
export const api = {
  isValidUUID(uuid: string): boolean {
    if (!uuid) return false
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
  },

  async authenticateUser(email: string, password: string): Promise<Member | null> {
    console.log("🔐 Authenticating user:", email)

    // Don't cache authentication attempts for security
    const { data: member, error } = await supabase.from("members").select("*").eq("email", email).single()
    if (error || !member) {
      console.log("❌ User not found:", email)
      return null
    }

    const isValidPassword = await verifyPassword(password, member.password_hash)
    if (!isValidPassword) {
      console.log("❌ Invalid password for:", email)
      return null
    }

    console.log("✅ User authenticated:", email)

    // Cache user data after successful authentication
    const cacheKey = getCacheKey("member", member.id)
    cacheManager.set(cacheKey, member, 10 * 60 * 1000) // 10 minutes

    // Ensure roles is an array for backward compatibility
    if (!member.roles || !Array.isArray(member.roles)) {
      member.roles = ["New Member"]
    }

    return member as Member
  },

  async uploadProfilePicture(file: File, userId: string): Promise<string | null> {
    try {
      console.log("🔄 Starting profile picture upload for user:", userId)

      // Validate file type
      const fileType = file.type.toLowerCase()
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]

      if (!validTypes.includes(fileType)) {
        throw new Error(`File type ${fileType} not allowed. Please use: ${validTypes.join(", ")}`)
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error("File size too large. Please select an image smaller than 5MB.")
      }

      // Compress the image with optimized settings for profile pictures
      const compressedFile = await compressImage(file, {
        quality: 0.85,
        maxWidth: 400, // Profile pictures don't need to be huge
        maxHeight: 400,
        format: "jpeg", // Consistent format
      })

      // Generate a unique file path
      const fileExtension = "jpg"
      const uniqueFileName = `${userId}-${Date.now()}.${fileExtension}`
      const filePath = `${userId}/${uniqueFileName}`
      const bucketName = "profile-pictures"

      // Upload to Supabase Storage
      const fileUrl = await uploadToStorage(compressedFile, bucketName, filePath, userId, {
        cacheControl: "public, max-age=31536000", // Cache for 1 year
      })

      console.log("✅ Profile picture uploaded successfully")

      // Invalidate user cache
      invalidateUserCache(userId)

      return fileUrl
    } catch (error) {
      console.error("❌ Error in uploadProfilePicture:", error)
      throw error
    }
  },

  async deleteProfilePicture(profilePictureUrl: string): Promise<boolean> {
    try {
      // Use our API route to delete the file
      const response = await fetch("/api/storage/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: profilePictureUrl,
          bucketName: "profile-pictures",
        }),
      })

      if (!response.ok) {
        console.error("❌ Error deleting file from storage")
        return false
      }

      console.log("✅ Profile picture deleted from storage")
      return true
    } catch (error) {
      console.error("❌ Error in deleteProfilePicture:", error)
      return false
    }
  },

  async deleteLibraryFile(fileUrl: string): Promise<boolean> {
    try {
      // Use our API route to delete the file (same as profile pictures)
      const response = await fetch("/api/storage/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: fileUrl,
          bucketName: "library-uploads",
        }),
      })

      if (!response.ok) {
        console.error("❌ Error deleting library file from storage")
        return false
      }

      console.log("✅ Library file deleted from storage")
      return true
    } catch (error) {
      console.error("❌ Error in deleteLibraryFile:", error)
      return false
    }
  },

  async deleteLibraryFileByPath(storagePath: string): Promise<boolean> {
    try {
      // Use our API route to delete the file using storage path
      const response = await fetch("/api/storage/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storagePath: storagePath,
          bucketName: "library-uploads",
        }),
      })

      if (!response.ok) {
        console.error("❌ Error deleting library file from storage")
        return false
      }

      console.log("✅ Library file deleted from storage")
      return true
    } catch (error) {
      console.error("❌ Error in deleteLibraryFileByPath:", error)
      return false
    }
  },

  async deleteLibraryFileFromDatabase(fileId: string, organizationId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from("library_files_new").delete().eq("id", fileId)

      if (error) {
        console.error("❌ Database deletion failed:", error)
        return false
      }

      // Clear caches
      cacheManager.delete(getCacheKey("library_files", organizationId))
      cacheManager.delete(getCacheKey("library_classes", organizationId))

      console.log("✅ File deleted from database successfully")
      return true
    } catch (error) {
      console.error("❌ Error in deleteLibraryFileFromDatabase:", error)
      return false
    }
  },

  async createOrganization(orgData: {
    groupId: string
    name: string
    type: string
    university: string
    chapterDesignation: string
    isColony: boolean
    foundedYear: string
    createdBy?: string
    roles?: Array<{ id: string; name: string; isDefault: boolean; color: string; isAdmin: boolean }>
  }): Promise<Organization> {
    console.log("🏢 Creating organization:", orgData.name, "Group ID:", orgData.groupId)

    let createdBy = orgData.createdBy
    if (createdBy && !this.isValidUUID(createdBy)) {
      console.log(`⚠️ Invalid createdBy UUID: ${createdBy}, setting to null`)
      createdBy = undefined
    }

    // Default roles with Group Owner
    const defaultRoles = orgData.roles || [
      { id: "group_owner", name: "Group Owner", color: "#7c3aed", isDefault: true, isAdmin: true },
      { id: "president", name: "President", color: "#dc2626", isDefault: true, isAdmin: true },
      { id: "treasurer", name: "Treasurer", color: "#059669", isDefault: true, isAdmin: true },
      { id: "active", name: "Active", color: "#2563eb", isDefault: true, isAdmin: false },
      { id: "new_member", name: "New Member", color: "#f59e0b", isDefault: true, isAdmin: false },
    ]

    const { data, error } = await supabase
      .from("organizations")
      .insert({
        group_id: orgData.groupId,
        name: orgData.name,
        type: orgData.type,
        university: orgData.university,
        chapter_designation: orgData.chapterDesignation,
        is_colony: orgData.isColony,
        founded_year: orgData.foundedYear,
        created_by: createdBy,
        roles: defaultRoles,
        features: {
          events: true,
          study: true,
          tasks: true,
          library: true,
          messages: true,
          announcements: true,
          pledgeSystem: true,
        },
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Error creating organization:", error)
      throw new Error(`Failed to create organization: ${error.message}`)
    }

    console.log("✅ Organization created successfully:", (data as Organization).group_id)
    return data as Organization
  },

  async getOrganizationByGroupId(groupId: string): Promise<Organization | null> {
    if (!groupId) return null

    const cacheKey = getCacheKey("organization", "group", groupId.toUpperCase())

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("organizations")
          .select("*")
          .eq("group_id", groupId.toUpperCase())
          .single()

        if (error) {
          if (error.code === "PGRST116") return null
          throw new Error(`Failed to fetch organization: ${error.message}`)
        }

        console.log("✅ Found organization:", (data as Organization).name)
        return data as Organization
      },
      30 * 60 * 1000,
    ) // Cache for 30 minutes
  },

  async getOrganizationById(id: string): Promise<Organization | null> {
    if (!id) return null

    const cacheKey = getCacheKey("organization", id)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single()

        if (error) {
          if (error.code === "PGRST116") return null
          throw new Error(`Failed to fetch organization: ${error.message}`)
        }

        return data as Organization
      },
      30 * 60 * 1000,
    )
  },

  async getAllOrganizations(): Promise<Organization[]> {
    const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false })
    if (error) {
      console.error("❌ Error fetching organizations:", error)
      throw new Error(`Failed to fetch organizations: ${error.message}`)
    }
    return (data || []) as Organization[]
  },

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null> {
    if (!id) return null
    const { data, error } = await supabase.from("organizations").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating organization:", error)
      throw new Error(`Failed to update organization: ${error.message}`)
    }

    // Clear cache
    cacheManager.delete(getCacheKey("organization", id))
    cacheManager.delete(getCacheKey("org", id))

    return data as Organization
  },

  async transferOrganizationOwnership(
    organizationId: string,
    newOwnerId: string,
    currentOwnerId: string,
  ): Promise<boolean> {
    try {
      // Start a transaction-like operation

      // 1. Update the organization's created_by field
      const { error: orgError } = await supabase
        .from("organizations")
        .update({ created_by: newOwnerId })
        .eq("id", organizationId)
        .eq("created_by", currentOwnerId) // Ensure current user is the owner

      if (orgError) {
        throw new Error(`Failed to update organization ownership: ${orgError.message}`)
      }

      // 2. Remove Group Owner role from current owner and add regular role
      const currentOwner = await this.getMemberById(currentOwnerId)
      if (currentOwner) {
        const updatedCurrentOwnerRoles = currentOwner.roles?.filter((role) => role !== "Group Owner") || []
        if (updatedCurrentOwnerRoles.length === 0) {
          updatedCurrentOwnerRoles.push("Active") // Give them at least Active role
        }

        await this.updateMember(currentOwnerId, { roles: updatedCurrentOwnerRoles })
      }

      // 3. Add Group Owner role to new owner
      const newOwner = await this.getMemberById(newOwnerId)
      if (newOwner) {
        const updatedNewOwnerRoles = [...(newOwner.roles || []), "Group Owner"]
        // Remove duplicates
        const uniqueRoles = [...new Set(updatedNewOwnerRoles)]

        await this.updateMember(newOwnerId, { roles: uniqueRoles })
      }

      // Clear relevant caches
      invalidateOrganizationCache(organizationId)
      invalidateUserCache(currentOwnerId)
      invalidateUserCache(newOwnerId)

      return true
    } catch (error) {
      console.error("❌ Error transferring organization ownership:", error)
      throw error
    }
  },

  async deleteOrganization(organizationId: string, userId: string): Promise<boolean> {
    try {
      // Verify user is the group owner
      const organization = await this.getOrganizationById(organizationId)
      if (!organization || organization.created_by !== userId) {
        throw new Error("Only the group owner can delete the organization")
      }

      // Delete all related data (this should be done carefully with proper foreign key constraints)
      // For now, we'll just delete the organization and let cascade handle the rest
      const { error } = await supabase.from("organizations").delete().eq("id", organizationId)

      if (error) {
        throw new Error(`Failed to delete organization: ${error.message}`)
      }

      // Clear all related caches
      invalidateOrganizationCache(organizationId)

      return true
    } catch (error) {
      console.error("❌ Error deleting organization:", error)
      throw error
    }
  },

  async createMember(memberData: {
    name: string
    email: string
    password: string
    phoneNumber?: string
    major?: string
    organizationId: string
    chapter: string
    university: string
    organizationType: string
    roles?: string[]
    approved: boolean
    isOwner?: boolean
  }): Promise<Member> {
    if (!this.isValidUUID(memberData.organizationId)) {
      console.error("❌ Invalid organization ID format:", memberData.organizationId)
      throw new Error("Invalid organization ID format. Must be a valid UUID.")
    }

    const { data: existingMember } = await supabase
      .from("members")
      .select("email")
      .eq("email", memberData.email)
      .single()
    if (existingMember) {
      throw new Error("Email already registered")
    }

    const passwordHash = await hashPassword(memberData.password)

    // Get organization to check if pledge system is enabled
    const organization = await this.getOrganizationById(memberData.organizationId)
    const pledgeSystemEnabled = organization?.features?.pledgeSystem !== false

    // Determine roles - Group Owner for creator, New Member for others
    let roles = memberData.roles
    if (!roles) {
      roles = memberData.isOwner ? ["Group Owner"] : ["New Member"]
    }

    const { data: newMember, error } = await supabase
      .from("members")
      .insert({
        name: memberData.name,
        email: memberData.email,
        password_hash: passwordHash,
        phone_number: memberData.phoneNumber,
        major: memberData.major,
        organization_id: memberData.organizationId,
        chapter: memberData.chapter,
        university: memberData.university,
        organization_type: memberData.organizationType,
        roles: roles,
        approved: memberData.approved,
        is_new_member: pledgeSystemEnabled && !memberData.isOwner,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Error creating member:", error)
      throw new Error(`Failed to create member: ${error.message}`)
    }

    // Clear members cache for this organization
    cacheManager.delete(getCacheKey("members", memberData.organizationId))

    console.log("✅ Member created successfully:", (newMember as Member).email)
    return newMember as Member
  },

  async getMemberByEmail(email: string): Promise<Member | null> {
    if (!email) return null
    const { data, error } = await supabase.from("members").select("*").eq("email", email).single()
    if (error) {
      if (error.code === "PGRST116") return null
      console.error("❌ Error fetching member by email:", error)
      throw new Error(`Failed to fetch member: ${error.message}`)
    }

    const member = data as Member
    // Ensure roles is an array
    if (!member.roles || !Array.isArray(member.roles)) {
      member.roles = ["New Member"]
    }

    return member
  },

  // Optimized version that only fetches basic member info (no profile pictures)
  async getMembersBasicByOrganization(
    organizationId: string,
  ): Promise<Pick<Member, "id" | "name" | "email" | "roles" | "approved">[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("members_basic", organizationId)
    const cached = getCache(cacheKey)
    if (cached) return cached

    const { data, error } = await supabase
      .from("members")
      .select("id, name, email, roles, approved")
      .eq("organization_id", organizationId)
      .order("join_date", { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch members: ${error.message}`)
    }

    const members = (data || []).map((member: any) => {
      // Ensure roles is an array
      if (!member.roles || !Array.isArray(member.roles)) {
        member.roles = ["New Member"]
      }
      return member
    }) as Pick<Member, "id" | "name" | "email" | "roles" | "approved">[]

    setCache(cacheKey, members)
    return members
  },

  async getMembersByOrganization(organizationId: string): Promise<Member[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("members", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("members")
          .select("*")
          .eq("organization_id", organizationId)
          .order("join_date", { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch members: ${error.message}`)
        }

        const members = (data || []).map((member: any) => {
          // Ensure roles is an array
          if (!member.roles || !Array.isArray(member.roles)) {
            member.roles = ["New Member"]
          }
          return member
        }) as Member[]

        return members
      },
      10 * 60 * 1000,
    ) // Cache for 10 minutes
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member | null> {
    if (!id) return null

    const updatePayload: any = { ...updates }
    if (updates.password) {
      updatePayload.password_hash = await hashPassword(updates.password)
      delete updatePayload.password
    }

    // Handle roles update - ensure it's stored as JSONB array
    if (updates.roles) {
      updatePayload.roles = updates.roles // pass the array directly
    }

    const { data, error } = await supabase.from("members").update(updatePayload).eq("id", id).select().single()
    if (error) {
      throw new Error(`Failed to update member: ${error.message}`)
    }

    const member = data as Member

    // Ensure roles is an array
    if (!member.roles || !Array.isArray(member.roles)) {
      member.roles = ["New Member"]
    }

    // Invalidate caches
    invalidateUserCache(id)
    invalidateOrganizationCache(member.organization_id)

    return member
  },

  async addRoleToMember(memberId: string, roleName: string): Promise<Member | null> {
    if (!memberId || !roleName) return null

    try {
      // Get current member data
      const member = await this.getMemberById(memberId)
      if (!member) return null

      // Ensure roles is an array
      const currentRoles = Array.isArray(member.roles) ? member.roles : ["New Member"]

      // Add role if not already present
      if (!currentRoles.includes(roleName)) {
        const updatedRoles = [...currentRoles, roleName]
        return await this.updateMember(memberId, { roles: updatedRoles })
      }

      return member
    } catch (error) {
      console.error("❌ Error adding role to member:", error)
      throw error
    }
  },

  async removeRoleFromMember(memberId: string, roleName: string): Promise<Member | null> {
    if (!memberId || !roleName) return null

    try {
      // Get current member data
      const member = await this.getMemberById(memberId)
      if (!member) return null

      // Ensure roles is an array
      const currentRoles = Array.isArray(member.roles) ? member.roles : ["New Member"]

      // Don't allow removing the last role
      if (currentRoles.length <= 1) {
        throw new Error("Members must have at least one role")
      }

      // Don't allow removing Group Owner role (only transfer ownership can do that)
      if (roleName === "Group Owner") {
        throw new Error("Cannot remove Group Owner role. Use transfer ownership instead.")
      }

      // Remove role if present
      const updatedRoles = currentRoles.filter((role) => role !== roleName)
      if (updatedRoles.length !== currentRoles.length) {
        return await this.updateMember(memberId, { roles: updatedRoles })
      }

      return member
    } catch (error) {
      console.error("❌ Error removing role from member:", error)
      throw error
    }
  },

  async deleteMember(id: string): Promise<boolean> {
    if (!id) return false

    // Get member info before deletion to clear cache
    const { data: member } = await supabase.from("members").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("members").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting member:", error)
      throw new Error(`Failed to delete member: ${error.message}`)
    }

    // Clear caches
    if (member) {
      cacheManager.delete(getCacheKey("members", member.organization_id))
      cacheManager.delete(getCacheKey("members_basic", member.organization_id))
    }

    return true
  },

  async getMemberById(id: string): Promise<Member | null> {
    if (!id) return null

    const cacheKey = getCacheKey("member", id)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("members").select("*").eq("id", id).single()

        if (error) {
          if (error.code === "PGRST116") return null
          throw new Error(`Failed to fetch member: ${error.message}`)
        }

        const member = data as Member
        // Ensure roles is an array
        if (!member.roles || !Array.isArray(member.roles)) {
          member.roles = ["New Member"]
        }

        return member
      },
      10 * 60 * 1000,
    )
  },

  // Add these new optimized functions to the api object:

  // Optimized member lookup with longer cache for basic info
  async getMemberBasicInfo(id: string): Promise<Pick<Member, "id" | "name" | "email" | "roles"> | null> {
    if (!id) return null

    const cacheKey = getCacheKey("member_basic", id)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("members").select("id, name, email, roles").eq("id", id).single()

        if (error) {
          if (error.code === "PGRST116") return null
          throw new Error(`Failed to fetch member: ${error.message}`)
        }

        const member = data as Pick<Member, "id" | "name" | "email" | "roles">
        // Ensure roles is an array
        if (!member.roles || !Array.isArray(member.roles)) {
          member.roles = ["New Member"]
        }

        return member
      },
      30 * 60 * 1000, // Cache basic info for 30 minutes
    )
  },

  // Batch fetch members to reduce queries
  async getMembersByIds(ids: string[]): Promise<Member[]> {
    if (!ids.length) return []

    const cacheKey = getCacheKey("members_batch", ids.sort().join(","))

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("members").select("*").in("id", ids)

        if (error) {
          throw new Error(`Failed to fetch members: ${error.message}`)
        }

        const members = (data || []).map((member: any) => {
          // Ensure roles is an array
          if (!member.roles || !Array.isArray(member.roles)) {
            member.roles = ["New Member"]
          }
          return member
        }) as Member[]

        return members
      },
      10 * 60 * 1000,
    )
  },

  // Optimized organization stats with heavy caching
  async getOrganizationStats(organizationId: string): Promise<{
    memberCount: number
    eventCount: number
    announcementCount: number
    libraryFileCount: number
  }> {
    if (!organizationId) return { memberCount: 0, eventCount: 0, announcementCount: 0, libraryFileCount: 0 }

    const cacheKey = getCacheKey("org_stats", organizationId)

    return withCache(
      cacheKey,
      async () => {
        // Use count queries instead of fetching all data
        const [membersResult, eventsResult, announcementsResult, libraryResult] = await Promise.all([
          supabase.from("members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
          supabase.from("events").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
          supabase
            .from("announcements")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId),
          supabase
            .from("library_files_new")
            .select("id", { count: "exact", head: true })
            .eq("organization_id", organizationId),
        ])

        return {
          memberCount: membersResult.count || 0,
          eventCount: eventsResult.count || 0,
          announcementCount: announcementsResult.count || 0,
          libraryFileCount: libraryResult.count || 0,
        }
      },
      60 * 60 * 1000, // Cache stats for 1 hour
    )
  },

  // Optimized recent activity with pagination
  async getRecentActivity(organizationId: string, limit = 10): Promise<any[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("recent_activity", organizationId, limit.toString())

    return withCache(
      cacheKey,
      async () => {
        // Get recent items from multiple tables
        const [recentEvents, recentAnnouncements, recentLibraryFiles] = await Promise.all([
          supabase
            .from("events")
            .select("id, title, created_at, 'event' as type")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .limit(Math.ceil(limit / 3)),

          supabase
            .from("announcements")
            .select("id, title, created_at, 'announcement' as type")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .limit(Math.ceil(limit / 3)),

          supabase
            .from("library_files_new")
            .select("id, display_name as title, created_at, 'library' as type")
            .eq("organization_id", organizationId)
            .order("created_at", { ascending: false })
            .limit(Math.ceil(limit / 3)),
        ])

        // Combine and sort by date
        const allActivity = [
          ...(recentEvents.data || []),
          ...(recentAnnouncements.data || []),
          ...(recentLibraryFiles.data || []),
        ]

        return allActivity
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, limit)
      },
      5 * 60 * 1000, // Cache for 5 minutes
    )
  },

  async createEvent(eventData: Omit<Event, "id" | "created_at" | "updated_at">): Promise<Event> {
    const { data, error } = await supabase.from("events").insert(eventData).select().single()
    if (error) {
      throw new Error(`Failed to create event: ${error.message}`)
    }

    // Invalidate events cache
    invalidateOrganizationCache(eventData.organization_id)

    return data as Event
  },

  async getEventsByOrganization(organizationId: string): Promise<Event[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("events", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("organization_id", organizationId)
          .order("start_time", { ascending: true })

        if (error) {
          throw new Error(`Failed to fetch events: ${error.message}`)
        }

        return (data || []) as Event[]
      },
      5 * 60 * 1000,
    ) // Cache for 5 minutes
  },

  // Optimized version for dashboard - only upcoming events
  async getUpcomingEventsByOrganization(organizationId: string, limit = 5): Promise<Event[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("upcoming_events", organizationId, limit.toString())

    return withCache(
      cacheKey,
      async () => {
        const now = new Date().toISOString()
        const { data, error } = await supabase
          .from("events")
          .select("id, title, start_time, end_time, location, type")
          .eq("organization_id", organizationId)
          .gte("start_time", now)
          .order("start_time", { ascending: true })
          .limit(limit)

        if (error) {
          throw new Error(`Failed to fetch upcoming events: ${error.message}`)
        }

        return (data || []) as Event[]
      },
      2 * 60 * 1000,
    ) // Cache for 2 minutes (more frequent updates for upcoming events)
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event | null> {
    if (!id) return null
    const { data, error } = await supabase.from("events").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating event:", error)
      throw new Error(`Failed to update event: ${error.message}`)
    }

    // Clear events cache
    const event = data as Event
    cacheManager.delete(getCacheKey("events", event.organization_id))

    return event
  },

  async deleteEvent(id: string): Promise<boolean> {
    if (!id) return false

    // Get event info before deletion to clear cache
    const { data: event } = await supabase.from("events").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("events").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting event:", error)
      throw new Error(`Failed to delete event: ${error.message}`)
    }

    // Clear cache
    if (event) {
      cacheManager.delete(getCacheKey("events", event.organization_id))
    }

    return true
  },

  async getEventImages(eventId: string): Promise<any[]> {
    if (!eventId) return []
    const { data, error } = await supabase
      .from("event_images")
      .select("*")
      .eq("event_id", eventId)
      .order("uploaded_at", { ascending: false })
    if (error) {
      console.error("❌ Error fetching event images:", error)
      return []
    }
    return data || []
  },

  async uploadEventImage(eventId: string, file: File, uploadedBy: string): Promise<any> {
    const imageUrl = URL.createObjectURL(file) // Placeholder
    const { data, error } = await supabase
      .from("event_images")
      .insert({ event_id: eventId, image_url: imageUrl, uploaded_by: uploadedBy })
      .select()
      .single()
    if (error) {
      console.error("❌ Error uploading event image:", error)
      throw new Error(`Failed to upload event image: ${error.message}`)
    }
    return data
  },

  async getEventById(eventId: string): Promise<Event | null> {
    if (!eventId) return null
    const { data, error } = await supabase.from("events").select("*").eq("id", eventId).single()
    if (error) {
      if (error.code === "PGRST116") return null
      console.error("❌ Error fetching event by ID:", error)
      throw new Error(`Failed to fetch event: ${error.message}`)
    }
    if (data) {
      const images = await this.getEventImages(eventId)
      ;(data as Event).images = images.length > 0 ? images : []
    }
    return data as Event
  },

  async getEventAttendee(eventId: string, memberId: string): Promise<EventAttendee | null> {
    if (!eventId || !memberId) return null
    const { data, error } = await supabase
      .from("event_attendees")
      .select("*")
      .eq("event_id", eventId)
      .eq("member_id", memberId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      console.error("❌ Error fetching event attendee:", error)
      return null
    }
    return data as EventAttendee
  },

  async addEventAttendee(eventId: string, memberId: string): Promise<EventAttendee> {
    const { data, error } = await supabase
      .from("event_attendees")
      .insert({ event_id: eventId, member_id: memberId, status: "attending" })
      .select()
      .single()
    if (error) {
      console.error("❌ Error adding event attendee:", error)
      throw new Error(`Failed to add event attendee: ${error.message}`)
    }
    return data as EventAttendee
  },

  async removeEventAttendee(eventId: string, memberId: string): Promise<boolean> {
    const { error } = await supabase.from("event_attendees").delete().eq("event_id", eventId).eq("member_id", memberId)
    if (error) {
      console.error("❌ Error removing event attendee:", error)
      throw new Error(`Failed to remove event attendee: ${error.message}`)
    }
    return true
  },

  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    if (!eventId) return []
    const { data, error } = await supabase.from("event_attendees").select("*").eq("event_id", eventId)
    if (error) {
      console.error("❌ Error fetching event attendees:", error)
      throw new Error(`Failed to fetch event attendees: ${error.message}`)
    }
    return (data || []) as EventAttendee[]
  },

  async createAnnouncement(announcementData: Omit<Announcement, "id" | "created_at">): Promise<Announcement> {
    const { data, error } = await supabase.from("announcements").insert(announcementData).select().single()
    if (error) {
      throw new Error(`Failed to create announcement: ${error.message}`)
    }

    // Invalidate announcements cache
    invalidateOrganizationCache(announcementData.organization_id)

    return data as Announcement
  },

  async getAnnouncementsByOrganization(organizationId: string): Promise<Announcement[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("announcements", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch announcements: ${error.message}`)
        }

        return (data || []) as Announcement[]
      },
      5 * 60 * 1000,
    )
  },

  // Optimized version for dashboard - only recent announcements
  async getRecentAnnouncementsByOrganization(organizationId: string, limit = 3): Promise<Announcement[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("recent_announcements", organizationId, limit.toString())

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("announcements")
          .select("id, title, content, author_name, created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(limit)

        if (error) {
          throw new Error(`Failed to fetch recent announcements: ${error.message}`)
        }

        return (data || []) as Announcement[]
      },
      2 * 60 * 1000,
    )
  },

  async updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | null> {
    if (!id) return null
    const { data, error } = await supabase.from("announcements").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating announcement:", error)
      throw new Error(`Failed to update announcement: ${error.message}`)
    }

    // Clear announcements cache
    const announcement = data as Announcement
    cacheManager.delete(getCacheKey("announcements", announcement.organization_id))

    return announcement
  },

  async deleteAnnouncement(id: string): Promise<boolean> {
    if (!id) return false

    // Get announcement info before deletion to clear cache
    const { data: announcement } = await supabase.from("announcements").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("announcements").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting announcement:", error)
      throw new Error(`Failed to delete announcement: ${error.message}`)
    }

    // Clear cache
    if (announcement) {
      cacheManager.delete(getCacheKey("announcements", announcement.organization_id))
    }

    return true
  },

  // Group Chat Functions
  async createGroupChat(groupChatData: {
    name: string
    organizationId: string
    createdBy: string
    memberIds: string[]
  }): Promise<GroupChat> {
    // Create the group chat
    const { data: groupChat, error: groupError } = await supabase
      .from("group_chats")
      .insert({
        name: groupChatData.name,
        organization_id: groupChatData.organizationId,
        created_by: groupChatData.createdBy,
      })
      .select()
      .single()

    if (groupError) {
      console.error("❌ Error creating group chat:", groupError)
      throw new Error(`Failed to create group chat: ${groupError.message}`)
    }

    // Add members to the group chat
    const memberInserts = groupChatData.memberIds.map((memberId) => ({
      group_chat_id: groupChat.id,
      member_id: memberId,
    }))

    const { error: membersError } = await supabase.from("group_chat_members").insert(memberInserts)

    if (membersError) {
      console.error("❌ Error adding members to group chat:", membersError)
      // Clean up the group chat if member addition fails
      await supabase.from("group_chats").delete().eq("id", groupChat.id)
      throw new Error(`Failed to add members to group chat: ${membersError.message}`)
    }

    return groupChat as GroupChat
  },

  async getGroupChatsByOrganization(organizationId: string): Promise<GroupChat[]> {
    if (!organizationId) return []

    const { data, error } = await supabase
      .from("group_chats")
      .select(`
        *,
        group_chat_members(count)
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Error fetching group chats:", error)
      throw new Error(`Failed to fetch group chats: ${error.message}`)
    }

    const groupChats = (data || []).map((chat) => ({
      ...chat,
      member_count: chat.group_chat_members?.[0]?.count || 0,
    })) as GroupChat[]

    return groupChats
  },

  async getGroupChatMembers(groupChatId: string): Promise<Member[]> {
    if (!groupChatId) return []

    try {
      // First get the member IDs
      const { data: memberData, error: memberError } = await supabase
        .from("group_chat_members")
        .select("member_id")
        .eq("group_chat_id", groupChatId)

      if (memberError) {
        console.error("❌ Error fetching group chat member IDs:", memberError)
        throw new Error(`Failed to fetch group chat member IDs: ${memberError.message}`)
      }

      if (!memberData || memberData.length === 0) {
        return []
      }

      // Extract member IDs
      const memberIds = memberData.map((item) => item.member_id)

      // Then fetch the actual member details
      const { data: members, error: membersError } = await supabase.from("members").select("*").in("id", memberIds)

      if (membersError) {
        console.error("❌ Error fetching group chat members:", membersError)
        throw new Error(`Failed to fetch group chat members: ${membersError.message}`)
      }

      return (members || []).map((member: any) => {
        // Ensure roles is an array
        if (!member.roles || !Array.isArray(member.roles)) {
          member.roles = ["New Member"]
        }
        return member
      }) as Member[]
    } catch (error) {
      console.error("❌ Error in getGroupChatMembers:", error)
      throw error
    }
  },

  async getUserGroupChats(userId: string, organizationId: string): Promise<GroupChat[]> {
    if (!userId || !organizationId) return []

    const { data, error } = await supabase
      .from("group_chat_members")
      .select(`
        group_chats(*)
      `)
      .eq("member_id", userId)
      .eq("group_chats.organization_id", organizationId)

    if (error) {
      console.error("❌ Error fetching user group chats:", error)
      throw new Error(`Failed to fetch user group chats: ${error.message}`)
    }

    return (data || []).map((item) => item.group_chats).filter(Boolean) as GroupChat[]
  },

  async createMessage(messageData: Omit<Message, "id" | "created_at">): Promise<Message> {
    const { data, error } = await supabase
      .from("messages")
      .insert({
        ...messageData,
        attachments: messageData.attachments || [],
        reactions: messageData.reactions || {},
      })
      .select()
      .single()
    if (error) {
      console.error("❌ Error creating message:", error)
      throw new Error(`Failed to create message: ${error.message}`)
    }
    return data as Message
  },

  // Optimized message loading with pagination
  async getMessagesBetweenUsers(
    userId1: string,
    userId2: string,
    organizationId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> {
    if (!userId1 || !userId2 || !organizationId) return []

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("organization_id", organizationId)
      .is("group_chat_id", null) // Only direct messages
      .or(
        `and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("❌ Error fetching messages:", error)
      throw new Error(`Failed to fetch messages: ${error.message}`)
    }

    // Reverse to get chronological order
    return ((data || []) as Message[]).reverse()
  },

  async getGroupChatMessages(groupChatId: string, limit = 50, offset = 0): Promise<Message[]> {
    if (!groupChatId) return []

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("group_chat_id", groupChatId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("❌ Error fetching group chat messages:", error)
      throw new Error(`Failed to fetch group chat messages: ${error.message}`)
    }

    // Reverse to get chronological order
    return ((data || []) as Message[]).reverse()
  },

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | null> {
    if (!id) return null
    const { data, error } = await supabase.from("messages").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating message:", error)
      throw new Error(`Failed to update message: ${error.message}`)
    }
    return data as Message
  },

  async createStudySession(
    sessionData: Omit<
      StudySession,
      "id" | "created_at" | "end_time" | "duration" | "status" | "userName" // Removed location_name from Omit here
    > & {
      location_name: string // Add location_name as a required field
      status?: "active"
    },
  ): Promise<StudySession> {
    const payload = {
      ...sessionData,
      status: sessionData.status || "active",
      duration: 0,
    }
    const { data: insertedData, error } = await supabase
      .from("study_sessions")
      .insert(payload)
      .select() // Select all columns of the inserted row
      .single()
    if (error) {
      console.error("❌ Error creating study session:", error)
      throw new Error(`Failed to create study session: ${error.message}`)
    }
    // Construct the return object. Use sessionData.location_name as the primary source for the name,
    // as this is what was sent for insertion.
    // Merge with insertedData for DB-generated fields like id, created_at.
    return {
      ...insertedData, // Contains id, created_at, user_id, location_id, status, duration, etc.
      location_name: sessionData.location_name, // Ensure we use the name we intended to insert.
    } as StudySession
  },

  async updateStudySession(id: string, updates: Partial<StudySession>): Promise<StudySession | null> {
    if (!id) return null
    const { data, error } = await supabase.from("study_sessions").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating study session:", error)
      throw new Error(`Failed to update study session: ${error.message}`)
    }
    let locationName = "Unknown Location"
    if (data && data.location_id) {
      const loc = await this.getStudyLocationById(data.location_id)
      if (loc) locationName = loc.name
    }
    return { ...data, location_name: locationName } as StudySession
  },

  async getStudySessionsByUser(
    userId: string,
    organizationId: string,
    status?: "active" | "completed" | "paused",
  ): Promise<StudySession[]> {
    if (!userId || !organizationId) return []
    let query = supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: false })
    if (status) {
      query = query.eq("status", status)
    }
    const { data, error } = await query
    if (error) {
      console.error("❌ Error fetching study sessions by user:", error)
      return []
    }
    const sessionsWithLocationNames = await Promise.all(
      (data || []).map(async (s: any) => {
        let locationName = s.location_name || "Unknown Location"
        if (s.location_id && !s.location_name) {
          const location = await this.getStudyLocationById(s.location_id)
          if (location) locationName = location.name
        }
        return { ...s, location_name: locationName }
      }),
    )
    return sessionsWithLocationNames as StudySession[]
  },

  async getLatestStudySession(userId: string, organizationId: string): Promise<StudySession | null> {
    if (!userId || !organizationId) return null
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching latest study session:", error)
      return null
    }
    if (!data) return null

    let locationName = data.location_name || "Unknown Location"
    if (data.location_id && !data.location_name) {
      const location = await this.getStudyLocationById(data.location_id)
      if (location) locationName = location.name
    }
    return { ...data, location_name: locationName } as StudySession
  },

  async endStudySession(sessionId: string): Promise<{ success: boolean; error?: any; data?: StudySession }> {
    if (!sessionId) {
      console.error("endStudySession: sessionId is required")
      return { success: false, error: new Error("Session ID is required.") }
    }
    try {
      const { data: sessionToUpdate, error: fetchError } = await supabase
        .from("study_sessions")
        .select("start_time, location_id")
        .eq("id", sessionId)
        .is("end_time", null)
        .single()

      if (fetchError || !sessionToUpdate) {
        console.error("Error fetching active session for duration or session not found/already ended:", fetchError)
        return { success: false, error: fetchError || new Error("Active session not found or already ended.") }
      }

      const startTime = new Date(sessionToUpdate.start_time)
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

      const { data, error } = await supabase
        .from("study_sessions")
        .update({
          end_time: endTime.toISOString(),
          status: "completed",
          duration: duration,
        })
        .eq("id", sessionId)
        .select()
        .single()

      if (error) {
        console.error("Error ending study session:", error)
        return { success: false, error }
      }
      let locationName = "Unknown Location"
      if (data && data.location_id) {
        const loc = await this.getStudyLocationById(data.location_id)
        if (loc) locationName = loc.name
      }
      return { success: true, data: { ...data, location_name: locationName } as StudySession }
    } catch (error) {
      console.error("Unexpected error ending study session:", error)
      return { success: false, error }
    }
  },

  async getStudySessionsByOrganization(organizationId: string): Promise<StudySession[]> {
    if (!organizationId) return []
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*") // Removed direct join: ", user:members(name)"
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: false })

    if (error) {
      console.error("❌ Error fetching study sessions for organization:", error)
      // Do not throw here for now, let the page handle empty/error state
      return []
    }

    const sessionsWithDetails = await Promise.all(
      (data || []).map(async (s: any) => {
        let locationName = s.location_name || "Unknown Location"
        if (s.location_id && !s.location_name) {
          const location = await this.getStudyLocationById(s.location_id)
          if (location) locationName = location.name
        }
        let userName = s.userName || "Unknown User"
        if (s.user_id && !s.userName) {
          // Fetch member name if user_id exists and userName isn't already populated
          const member = await this.getMemberById(s.user_id)
          if (member) userName = member.name
        }
        return {
          ...s,
          userName: userName,
          location_name: locationName,
        }
      }),
    )
    return sessionsWithDetails as StudySession[]
  },

  async getStudyLocationById(locationId: string): Promise<StudyLocation | null> {
    if (!locationId) return null

    const cacheKey = getCacheKey("study_location", locationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("study_locations").select("id, name").eq("id", locationId).single()

        if (error) {
          console.error(`Error fetching study location by ID ${locationId}:`, error)
          return null
        }

        return data as StudyLocation | null
      },
      30 * 60 * 1000,
    )
  },

  async getStudyLocationsByOrganization(organizationId: string): Promise<StudyLocation[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("study_locations", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("study_locations").select("*").eq("organization_id", organizationId)

        if (error) {
          throw new Error(`Failed to fetch study locations: ${error.message}`)
        }

        const processedData = (data || []).map((location: any) => {
          let parsedBoxCoordinates = location.box_coordinates
          if (location.box_coordinates && typeof location.box_coordinates === "string") {
            try {
              parsedBoxCoordinates = JSON.parse(location.box_coordinates)
            } catch (e) {
              console.error("Failed to parse box_coordinates for location:", location.id, e)
              parsedBoxCoordinates = null
            }
          }
          return { ...location, box_coordinates: parsedBoxCoordinates }
        })

        return processedData as StudyLocation[]
      },
      30 * 60 * 1000,
    ) // Cache for 30 minutes
  },

  async getLocationsByOrg(organizationId: string): Promise<StudyLocation[]> {
    // Alias for consistency
    return this.getStudyLocationsByOrganization(organizationId)
  },

  async createStudyLocation(locationData: Omit<StudyLocation, "id" | "created_at">): Promise<StudyLocation> {
    const { data, error } = await supabase.from("study_locations").insert(locationData).select().single()
    if (error) {
      console.error("❌ Error creating study location:", error)
      throw new Error(`Failed to create study location: ${error.message}`)
    }

    // Clear locations cache
    cacheManager.delete(getCacheKey("locations", locationData.organization_id))

    return data as StudyLocation
  },

  async updateStudyLocation(id: string, updates: Partial<StudyLocation>): Promise<StudyLocation | null> {
    if (!id) return null
    const { data, error } = await supabase.from("study_locations").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating study location:", error)
      throw new Error(`Failed to update study location: ${error.message}`)
    }

    // Clear caches
    const location = data as StudyLocation
    cacheManager.delete(getCacheKey("locations", location.organization_id))
    cacheManager.delete(getCacheKey("location", id))

    return location
  },

  async deleteStudyLocation(id: string): Promise<boolean> {
    if (!id) return false

    // Get location info before deletion to clear cache
    const { data: location } = await supabase.from("study_locations").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("study_locations").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting study location:", error)
      throw new Error(`Failed to delete study location: ${error.message}`)
    }

    // Clear caches
    if (location) {
      cacheManager.delete(getCacheKey("locations", location.organization_id))
      cacheManager.delete(getCacheKey("location", id))
    }

    return true
  },

  async createHour(hourData: Omit<Hour, "id" | "created_at">): Promise<Hour> {
    const hourPayload = { ...hourData }
    if (!hourPayload.user_name && hourPayload.user_id) {
      try {
        const member = await this.getMemberById(hourPayload.user_id)
        if (member) {
          hourPayload.user_name = member.name
        }
      } catch (error) {
        console.warn("Could not fetch member name for hour creation:", error)
      }
    }

    const { data, error } = await supabase.from("hours").insert(hourPayload).select().single()
    if (error) {
      throw new Error(`Failed to create hour: ${error.message}`)
    }

    // Invalidate hours cache
    invalidateOrganizationCache(hourData.organization_id)

    return data as Hour
  },

  async getHoursByOrganization(organizationId: string): Promise<Hour[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("hours", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("hours")
          .select("*")
          .eq("organization_id", organizationId)
          .order("date", { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch hours: ${error.message}`)
        }

        return (data || []) as Hour[]
      },
      5 * 60 * 1000,
    )
  },

  async getHoursByUser(userId: string, organizationId: string): Promise<Hour[]> {
    if (!userId || !organizationId) return []

    const cacheKey = getCacheKey("user_hours", userId, organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("hours")
          .select("*")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .order("date", { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch user hours: ${error.message}`)
        }

        return (data || []) as Hour[]
      },
      5 * 60 * 1000,
    )
  },

  /**
   * Fetch every Hour row belonging to a single member (any organisation).
   * A lightweight alias used by the Members dashboard.
   */
  async getMemberHours(memberId: string): Promise<Hour[]> {
    if (!memberId) return []

    try {
      const { data, error } = await supabase
        .from("hours")
        .select("*")
        .eq("user_id", memberId)
        .order("date", { ascending: false })

      if (error) {
        console.error(`❌ Error fetching hours for member ${memberId}:`, error)
        return []
      }

      return (data || []) as Hour[]
    } catch (err) {
      console.error(`❌ Unexpected error fetching hours for member ${memberId}:`, err)
      return []
    }
  },

  async updateHour(id: string, updates: Partial<Hour>): Promise<Hour | null> {
    if (!id) return null
    const { data, error } = await supabase.from("hours").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating hour:", error)
      throw new Error(`Failed to update hour: ${error.message}`)
    }

    // Clear hours cache
    const hour = data as Hour
    cacheManager.delete(getCacheKey("hours", hour.organization_id))

    return hour
  },

  async deleteHour(id: string): Promise<boolean> {
    if (!id) return false

    // Get hour info before deletion to clear cache
    const { data: hour } = await supabase.from("hours").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("hours").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting hour:", error)
      throw new Error(`Failed to delete hour: ${error.message}`)
    }

    // Clear cache
    if (hour) {
      cacheManager.delete(getCacheKey("hours", hour.organization_id))
    }

    return true
  },

  async getUserConversations(userId: string, organizationId: string): Promise<any[]> {
    if (!userId || !organizationId) return []

    // Get direct messages
    const { data: directMessages, error: directError } = await supabase
      .from("messages")
      .select("*")
      .eq("organization_id", organizationId)
      .is("group_chat_id", null) // Only direct messages
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })

    if (directError) {
      console.error("❌ Error fetching direct messages:", directError)
      throw new Error(`Failed to fetch direct messages: ${directError.message}`)
    }

    // Get group chat messages for groups the user is in
    const { data: userGroupChats, error: groupError } = await supabase
      .from("group_chat_members")
      .select(`
      group_chat_id,
      group_chats(*)
    `)
      .eq("member_id", userId)

    if (groupError) {
      console.error("❌ Error fetching user group chats:", groupError)
      throw new Error(`Failed to fetch user group chats: ${groupError.message}`)
    }

    const conversations = []

    // Process direct messages
    const directConversationsMap = {}

    for (const message of (directMessages || []) as Message[]) {
      // For direct messages, determine the other user's ID
      const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id
      if (!otherUserId) continue

      // Use the other user's ID as the conversation ID
      if (!directConversationsMap[otherUserId]) {
        directConversationsMap[otherUserId] = {
          id: otherUserId, // Use the other user's ID directly as the conversation ID
          type: "direct",
          participants: [userId, otherUserId],
          lastMessage: message,
          messages: [message],
        }
      } else {
        directConversationsMap[otherUserId].messages.push(message)
        if (new Date(message.created_at) > new Date(directConversationsMap[otherUserId].lastMessage.created_at)) {
          directConversationsMap[otherUserId].lastMessage = message
        }
      }
    }

    conversations.push(...Object.values(directConversationsMap))

    // Process group chats
    for (const groupChatData of userGroupChats || []) {
      const groupChatId = groupChatData.group_chat_id
      const groupChat = groupChatData.group_chats
      if (!groupChat) continue

      // Get messages for this group chat
      const { data: groupMessages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("group_chat_id", groupChatId)
        .order("created_at", { ascending: false })

      if (messagesError) {
        console.error("❌ Error fetching group messages:", messagesError)
        continue
      }

      const messages = (groupMessages || []) as Message[]
      if (messages.length > 0) {
        conversations.push({
          id: `group-${groupChatId}`,
          type: "group",
          groupChat: groupChat,
          lastMessage: messages[0],
          messages: messages.reverse(), // Reverse to get chronological order
        })
      } else {
        // Include group chats even if they have no messages yet
        conversations.push({
          id: `group-${groupChatId}`,
          type: "group",
          groupChat: groupChat,
          lastMessage: null,
          messages: [],
        })
      }
    }

    return conversations.sort((a: any, b: any) => {
      if (!a.lastMessage && !b.lastMessage) return 0
      if (!a.lastMessage) return 1
      if (!b.lastMessage) return -1
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    })
  },

  async removeGroupChatMember(groupChatId: string, memberId: string): Promise<boolean> {
    if (!groupChatId || !memberId) return false

    const { error } = await supabase
      .from("group_chat_members")
      .delete()
      .eq("group_chat_id", groupChatId)
      .eq("member_id", memberId)

    if (error) {
      console.error("❌ Error removing group chat member:", error)
      throw new Error(`Failed to remove group chat member: ${error.message}`)
    }

    return true
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    if (!messageId) return false

    const { error } = await supabase.from("messages").delete().eq("id", messageId)

    if (error) {
      console.error("❌ Error deleting message:", error)
      throw new Error(`Failed to delete message: ${error.message}`)
    }

    return true
  },

  async deleteDirectConversation(userId1: string, userId2: string, organizationId: string): Promise<boolean> {
    if (!userId1 || !userId2 || !organizationId) return false

    // Delete all messages between the two users
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("organization_id", organizationId)
      .is("group_chat_id", null)
      .or(
        `and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`,
      )

    if (error) {
      console.error("❌ Error deleting direct conversation messages:", error)
      throw new Error(`Failed to delete direct conversation: ${error.message}`)
    }

    return true
  },

  async deleteGroupChat(groupChatId: string): Promise<boolean> {
    if (!groupChatId) return false

    console.log("🗑️ Deleting group chat:", groupChatId)

    try {
      // Delete all messages in the group chat
      const { error: messagesError } = await supabase.from("messages").delete().eq("group_chat_id", groupChatId)

      if (messagesError) {
        console.error("❌ Error deleting group chat messages:", messagesError)
        throw new Error(`Failed to delete group chat messages: ${messagesError.message}`)
      }

      // Delete all group chat members
      const { error: membersError } = await supabase
        .from("group_chat_members")
        .delete()
        .eq("group_chat_id", groupChatId)

      if (membersError) {
        console.error("❌ Error deleting group chat members:", membersError)
        throw new Error(`Failed to delete group chat members: ${membersError.message}`)
      }

      // Delete the group chat itself
      const { error: groupChatError } = await supabase.from("group_chats").delete().eq("id", groupChatId)

      if (groupChatError) {
        console.error("❌ Error deleting group chat:", groupChatError)
        throw new Error(`Failed to delete group chat: ${groupChatError.message}`)
      }

      return true
    } catch (error) {
      console.error("❌ Error in deleteGroupChat:", error)
      throw error
    }
  },

  async debugState(): Promise<void> {
    try {
      const organizations = await this.getAllOrganizations()
      for (const org of organizations) {
        const members = await this.getMembersByOrganization(org.id)
      }
    } catch (error) {
      console.error("❌ Error in debug state:", error)
    }
  },

  // Library functions with caching
  async getLibraryFilesByOrganization(
    organizationId: string,
    filters?: {
      itemType?: string
      className?: string
      documentType?: string
      compositeType?: string
      compositeYear?: string
    },
  ): Promise<LibraryFile[]> {
    if (!organizationId) return []

    const filterKey = filters ? JSON.stringify(filters) : "all"
    const cacheKey = getCacheKey("library_files", organizationId, filterKey)

    return withCache(
      cacheKey,
      async () => {
        let query = supabase
          .from("library_files_new")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })

        // Apply filters
        if (filters?.itemType) {
          query = query.eq("item_type", filters.itemType)
        }
        if (filters?.className) {
          query = query.eq("class_name", filters.className.replace(/\s+/g, "").toUpperCase())
        }
        if (filters?.documentType) {
          query = query.eq("document_type", filters.documentType)
        }
        if (filters?.compositeType) {
          query = query.eq("composite_type", filters.compositeType)
        }
        if (filters?.compositeYear) {
          query = query.eq("composite_year", filters.compositeYear)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch library files: ${error.message}`)
        }

        return (data || []) as LibraryFile[]
      },
      15 * 60 * 1000,
    ) // Cache for 15 minutes
  },

  async getLibraryClasses(organizationId: string): Promise<string[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("library_classes", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("library_files_new")
          .select("class_name")
          .eq("organization_id", organizationId)
          .eq("item_type", "class")
          .not("class_name", "is", null)

        if (error) {
          throw new Error(`Failed to fetch library classes: ${error.message}`)
        }

        // Extract unique class names
        const classNames = [...new Set((data || []).map((item) => item.class_name).filter(Boolean))]
        return classNames.sort()
      },
      30 * 60 * 1000,
    ) // Cache for 30 minutes
  },

  async createGymLocation(locationData: Omit<GymLocation, "id" | "created_at">): Promise<GymLocation> {
    const { data, error } = await supabase.from("gym_locations").insert(locationData).select().single()
    if (error) {
      console.error("❌ Error creating gym location:", error)
      throw new Error(`Failed to create gym location: ${error.message}`)
    }

    // Clear locations cache
    cacheManager.delete(getCacheKey("gym_locations", locationData.organization_id))

    return data as GymLocation
  },

  async updateGymLocation(id: string, updates: Partial<GymLocation>): Promise<GymLocation | null> {
    if (!id) return null
    const { data, error } = await supabase.from("gym_locations").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating gym location:", error)
      throw new Error(`Failed to update gym location: ${error.message}`)
    }

    // Clear caches
    const location = data as GymLocation
    cacheManager.delete(getCacheKey("gym_locations", location.organization_id))
    cacheManager.delete(getCacheKey("gym_location", id))

    return location
  },

  async deleteGymLocation(id: string): Promise<boolean> {
    if (!id) return false

    // Get location info before deletion to clear cache
    const { data: location } = await supabase.from("gym_locations").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("gym_locations").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting gym location:", error)
      throw new Error(`Failed to delete gym location: ${error.message}`)
    }

    // Clear caches
    if (location) {
      cacheManager.delete(getCacheKey("gym_locations", location.organization_id))
      cacheManager.delete(getCacheKey("gym_location", id))
    }

    return true
  },

  async createGymSession(
    sessionData: Omit<
      GymSession,
      "id" | "created_at" | "end_time" | "duration" | "status" | "userName" // Removed location_name from Omit here
    > & {
      location_name: string // Add location_name as a required field
      status?: "active"
    },
  ): Promise<GymSession> {
    const payload = {
      ...sessionData,
      status: sessionData.status || "active",
      duration: 0,
    }
    const { data: insertedData, error } = await supabase
      .from("gym_sessions")
      .insert(payload)
      .select() // Select all columns of the inserted row
      .single()
    if (error) {
      console.error("❌ Error creating gym session:", error)
      throw new Error(`Failed to create gym session: ${error.message}`)
    }
    // Construct the return object. Use sessionData.location_name as the primary source for the name,
    // as this is what was sent for insertion.
    // Merge with insertedData for DB-generated fields like id, created_at.
    return {
      ...insertedData, // Contains id, created_at, user_id, location_id, status, duration, etc.
      location_name: sessionData.location_name, // Ensure we use the name we intended to insert.
    } as GymSession
  },

  async updateGymSession(id: string, updates: Partial<GymSession>): Promise<GymSession | null> {
    if (!id) return null
    const { data, error } = await supabase.from("gym_sessions").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating gym session:", error)
      throw new Error(`Failed to update gym session: ${error.message}`)
    }
    let locationName = "Unknown Location"
    if (data && data.location_id) {
      const loc = await this.getGymLocationById(data.location_id)
      if (loc) locationName = loc.name
    }
    return { ...data, location_name: locationName } as GymSession
  },

  async getGymSessionsByUser(
    userId: string,
    organizationId: string,
    status?: "active" | "completed" | "paused",
  ): Promise<GymSession[]> {
    if (!userId || !organizationId) return []
    let query = supabase
      .from("gym_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: false })
    if (status) {
      query = query.eq("status", status)
    }
    const { data, error } = await query
    if (error) {
      console.error("❌ Error fetching gym sessions by user:", error)
      return []
    }
    const sessionsWithLocationNames = await Promise.all(
      (data || []).map(async (s: any) => {
        let locationName = s.location_name || "Unknown Location"
        if (s.location_id && !s.location_name) {
          const location = await this.getGymLocationById(s.location_id)
          if (location) locationName = location.name
        }
        return { ...s, location_name: locationName }
      }),
    )
    return sessionsWithLocationNames as GymSession[]
  },

  async getLatestGymSession(userId: string, organizationId: string): Promise<GymSession | null> {
    if (!userId || !organizationId) return null
    const { data, error } = await supabase
      .from("gym_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching latest gym session:", error)
      return null
    }
    if (!data) return null

    let locationName = data.location_name || "Unknown Location"
    if (data.location_id && !data.location_name) {
      const location = await this.getGymLocationById(data.location_id)
      if (location) locationName = location.name
    }
    return { ...data, location_name: locationName } as GymSession
  },

  async endGymSession(sessionId: string): Promise<{ success: boolean; error?: any; data?: GymSession }> {
    if (!sessionId) {
      console.error("endGymSession: sessionId is required")
      return { success: false, error: new Error("Session ID is required.") }
    }
    try {
      const { data: sessionToUpdate, error: fetchError } = await supabase
        .from("gym_sessions")
        .select("start_time, location_id")
        .eq("id", sessionId)
        .is("end_time", null)
        .single()

      if (fetchError || !sessionToUpdate) {
        console.error("Error fetching active session for duration or session not found/already ended:", fetchError)
        return { success: false, error: fetchError || new Error("Active session not found or already ended.") }
      }

      const startTime = new Date(sessionToUpdate.start_time)
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

      const { data, error } = await supabase
        .from("gym_sessions")
        .update({
          end_time: endTime.toISOString(),
          status: "completed",
          duration: duration,
        })
        .eq("id", sessionId)
        .select()
        .single()

      if (error) {
        console.error("Error ending gym session:", error)
        return { success: false, error }
      }
      let locationName = "Unknown Location"
      if (data && data.location_id) {
        const loc = await this.getGymLocationById(data.location_id)
        if (loc) locationName = loc.name
      }
      return { success: true, data: { ...data, location_name: locationName } as GymSession }
    } catch (error) {
      console.error("Unexpected error ending gym session:", error)
      return { success: false, error }
    }
  },

  async getGymSessionsByOrganization(organizationId: string): Promise<GymSession[]> {
    if (!organizationId) return []
    const { data, error } = await supabase
      .from("gym_sessions")
      .select("*") // Removed direct join: ", user:members(name)"
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: false })

    if (error) {
      console.error("❌ Error fetching gym sessions for organization:", error)
      // Do not throw here for now, let the page handle empty/error state
      return []
    }

    const sessionsWithDetails = await Promise.all(
      (data || []).map(async (s: any) => {
        let locationName = s.location_name || "Unknown Location"
        if (s.location_id && !s.location_name) {
          const location = await this.getGymLocationById(s.location_id)
          if (location) locationName = location.name
        }
        let userName = s.userName || "Unknown User"
        if (s.user_id && !s.userName) {
          // Fetch member name if user_id exists and userName isn't already populated
          const member = await this.getMemberById(s.user_id)
          if (member) userName = member.name
        }
        return {
          ...s,
          userName: userName,
          location_name: locationName,
        }
      }),
    )
    return sessionsWithDetails as GymSession[]
  },

  async getGymLocationById(locationId: string): Promise<GymLocation | null> {
    if (!locationId) return null

    const cacheKey = getCacheKey("gym_location", locationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("gym_locations").select("id, name").eq("id", locationId).single()

        if (error) {
          console.error(`Error fetching gym location by ID ${locationId}:`, error)
          return null
        }

        return data as GymLocation | null
      },
      30 * 60 * 1000,
    )
  },

  async getGymLocationsByOrganization(organizationId: string): Promise<GymLocation[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("gym_locations", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("gym_locations").select("*").eq("organization_id", organizationId)

        if (error) {
          throw new Error(`Failed to fetch gym locations: ${error.message}`)
        }

        const processedData = (data || []).map((location: any) => {
          let parsedBoxCoordinates = location.box_coordinates
          if (location.box_coordinates && typeof location.box_coordinates === "string") {
            try {
              parsedBoxCoordinates = JSON.parse(location.box_coordinates)
            } catch (e) {
              console.error("Failed to parse box_coordinates for location:", location.id, e)
              parsedBoxCoordinates = null
            }
          }
          return { ...location, box_coordinates: parsedBoxCoordinates }
        })

        return processedData as GymLocation[]
      },
      30 * 60 * 1000,
    ) // Cache for 30 minutes
  },

  async getLocationsByOrg(organizationId: string): Promise<GymLocation[]> {
    // Alias for consistency
    return this.getGymLocationsByOrganization(organizationId)
  },

  async createGymLocation(locationData: Omit<GymLocation, "id" | "created_at">): Promise<GymLocation> {
    const { data, error } = await supabase.from("gym_locations").insert(locationData).select().single()
    if (error) {
      console.error("❌ Error creating gym location:", error)
      throw new Error(`Failed to create gym location: ${error.message}`)
    }

    // Clear locations cache
    cacheManager.delete(getCacheKey("gym_locations", locationData.organization_id))

    return data as GymLocation
  },

  async updateGymLocation(id: string, updates: Partial<GymLocation>): Promise<GymLocation | null> {
    if (!id) return null
    const { data, error } = await supabase.from("gym_locations").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating gym location:", error)
      throw new Error(`Failed to update gym location: ${error.message}`)
    }

    // Clear caches
    const location = data as GymLocation
    cacheManager.delete(getCacheKey("gym_locations", location.organization_id))
    cacheManager.delete(getCacheKey("gym_location", id))

    return location
  },

  async deleteGymLocation(id: string): Promise<boolean> {
    if (!id) return false

    // Get location info before deletion to clear cache
    const { data: location } = await supabase.from("gym_locations").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("gym_locations").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting gym location:", error)
      throw new Error(`Failed to delete gym location: ${error.message}`)
    }

    // Clear caches
    if (location) {
      cacheManager.delete(getCacheKey("gym_locations", location.organization_id))
      cacheManager.delete(getCacheKey("gym_location", id))
    }

    return true
  },

  async createHour(hourData: Omit<Hour, "id" | "created_at">): Promise<Hour> {
    const hourPayload = { ...hourData }
    if (!hourPayload.user_name && hourPayload.user_id) {
      try {
        const member = await this.getMemberById(hourPayload.user_id)
        if (member) {
          hourPayload.user_name = member.name
        }
      } catch (error) {
        console.warn("Could not fetch member name for hour creation:", error)
      }
    }

    const { data, error } = await supabase.from("hours").insert(hourPayload).select().single()
    if (error) {
      throw new Error(`Failed to create hour: ${error.message}`)
    }

    // Invalidate hours cache
    invalidateOrganizationCache(hourData.organization_id)

    return data as Hour
  },

  async getHoursByOrganization(organizationId: string): Promise<Hour[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("hours", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("hours")
          .select("*")
          .eq("organization_id", organizationId)
          .order("date", { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch hours: ${error.message}`)
        }

        return (data || []) as Hour[]
      },
      5 * 60 * 1000,
    )
  },

  async getHoursByUser(userId: string, organizationId: string): Promise<Hour[]> {
    if (!userId || !organizationId) return []

    const cacheKey = getCacheKey("user_hours", userId, organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("hours")
          .select("*")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .order("date", { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch user hours: ${error.message}`)
        }

        return (data || []) as Hour[]
      },
      5 * 60 * 1000,
    )
  },

  /**
   * Fetch every Hour row belonging to a single member (any organisation).
   * A lightweight alias used by the Members dashboard.
   */
  async getMemberHours(memberId: string): Promise<Hour[]> {
    if (!memberId) return []

    try {
      const { data, error } = await supabase
        .from("hours")
        .select("*")
        .eq("user_id", memberId)
        .order("date", { ascending: false })

      if (error) {
        console.error(`❌ Error fetching hours for member ${memberId}:`, error)
        return []
      }

      return (data || []) as Hour[]
    } catch (err) {
      console.error(`❌ Unexpected error fetching hours for member ${memberId}:`, err)
      return []
    }
  },

  async updateHour(id: string, updates: Partial<Hour>): Promise<Hour | null> {
    if (!id) return null
    const { data, error } = await supabase.from("hours").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating hour:", error)
      throw new Error(`Failed to update hour: ${error.message}`)
    }

    // Clear hours cache
    const hour = data as Hour
    cacheManager.delete(getCacheKey("hours", hour.organization_id))

    return hour
  },

  async deleteHour(id: string): Promise<boolean> {
    if (!id) return false

    // Get hour info before deletion to clear cache
    const { data: hour } = await supabase.from("hours").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("hours").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting hour:", error)
      throw new Error(`Failed to delete hour: ${error.message}`)
    }

    // Clear cache
    if (hour) {
      cacheManager.delete(getCacheKey("hours", hour.organization_id))
    }

    return true
  },

  async getUserConversations(userId: string, organizationId: string): Promise<any[]> {
    if (!userId || !organizationId) return []

    // Get direct messages
    const { data: directMessages, error: directError } = await supabase
      .from("messages")
      .select("*")
      .eq("organization_id", organizationId)
      .is("group_chat_id", null) // Only direct messages
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })

    if (directError) {
      console.error("❌ Error fetching direct messages:", directError)
      throw new Error(`Failed to fetch direct messages: ${directError.message}`)
    }

    // Get group chat messages for groups the user is in
    const { data: userGroupChats, error: groupError } = await supabase
      .from("group_chat_members")
      .select(`
      group_chat_id,
      group_chats(*)
    `)
      .eq("member_id", userId)

    if (groupError) {
      console.error("❌ Error fetching user group chats:", groupError)
      throw new Error(`Failed to fetch user group chats: ${groupError.message}`)
    }

    const conversations = []

    // Process direct messages
    const directConversationsMap = {}

    for (const message of (directMessages || []) as Message[]) {
      // For direct messages, determine the other user's ID
      const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id
      if (!otherUserId) continue

      // Use the other user's ID as the conversation ID
      if (!directConversationsMap[otherUserId]) {
        directConversationsMap[otherUserId] = {
          id: otherUserId, // Use the other user's ID directly as the conversation ID
          type: "direct",
          participants: [userId, otherUserId],
          lastMessage: message,
          messages: [message],
        }
      } else {
        directConversationsMap[otherUserId].messages.push(message)
        if (new Date(message.created_at) > new Date(directConversationsMap[otherUserId].lastMessage.created_at)) {
          directConversationsMap[otherUserId].lastMessage = message
        }
      }
    }

    conversations.push(...Object.values(directConversationsMap))

    // Process group chats
    for (const groupChatData of userGroupChats || []) {
      const groupChatId = groupChatData.group_chat_id
      const groupChat = groupChatData.group_chats
      if (!groupChat) continue

      // Get messages for this group chat
      const { data: groupMessages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("group_chat_id", groupChatId)
        .order("created_at", { ascending: false })

      if (messagesError) {
        console.error("❌ Error fetching group messages:", messagesError)
        continue
      }

      const messages = (groupMessages || []) as Message[]
      if (messages.length > 0) {
        conversations.push({
          id: `group-${groupChatId}`,
          type: "group",
          groupChat: groupChat,
          lastMessage: messages[0],
          messages: messages.reverse(), // Reverse to get chronological order
        })
      } else {
        // Include group chats even if they have no messages yet
        conversations.push({
          id: `group-${groupChatId}`,
          type: "group",
          groupChat: groupChat,
          lastMessage: null,
          messages: [],
        })
      }
    }

    return conversations.sort((a: any, b: any) => {
      if (!a.lastMessage && !b.lastMessage) return 0
      if (!a.lastMessage) return 1
      if (!b.lastMessage) return -1
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    })
  },

  async removeGroupChatMember(groupChatId: string, memberId: string): Promise<boolean> {
    if (!groupChatId || !memberId) return false

    const { error } = await supabase
      .from("group_chat_members")
      .delete()
      .eq("group_chat_id", groupChatId)
      .eq("member_id", memberId)

    if (error) {
      console.error("❌ Error removing group chat member:", error)
      throw new Error(`Failed to remove group chat member: ${error.message}`)
    }

    return true
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    if (!messageId) return false

    const { error } = await supabase.from("messages").delete().eq("id", messageId)

    if (error) {
      console.error("❌ Error deleting message:", error)
      throw new Error(`Failed to delete message: ${error.message}`)
    }

    return true
  },

  async deleteDirectConversation(userId1: string, userId2: string, organizationId: string): Promise<boolean> {
    if (!userId1 || !userId2 || !organizationId) return false

    // Delete all messages between the two users
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("organization_id", organizationId)
      .is("group_chat_id", null)
      .or(
        `and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`,
      )

    if (error) {
      console.error("❌ Error deleting direct conversation messages:", error)
      throw new Error(`Failed to delete direct conversation: ${error.message}`)
    }

    return true
  },

  async deleteGroupChat(groupChatId: string): Promise<boolean> {
    if (!groupChatId) return false

    console.log("🗑️ Deleting group chat:", groupChatId)

    try {
      // Delete all messages in the group chat
      const { error: messagesError } = await supabase.from("messages").delete().eq("group_chat_id", groupChatId)

      if (messagesError) {
        console.error("❌ Error deleting group chat messages:", messagesError)
        throw new Error(`Failed to delete group chat messages: ${messagesError.message}`)
      }

      // Delete all group chat members
      const { error: membersError } = await supabase
        .from("group_chat_members")
        .delete()
        .eq("group_chat_id", groupChatId)

      if (membersError) {
        console.error("❌ Error deleting group chat members:", membersError)
        throw new Error(`Failed to delete group chat members: ${membersError.message}`)
      }

      // Delete the group chat itself
      const { error: groupChatError } = await supabase.from("group_chats").delete().eq("id", groupChatId)

      if (groupChatError) {
        console.error("❌ Error deleting group chat:", groupChatError)
        throw new Error(`Failed to delete group chat: ${groupChatError.message}`)
      }

      return true
    } catch (error) {
      console.error("❌ Error in deleteGroupChat:", error)
      throw error
    }
  },

  async debugState(): Promise<void> {
    try {
      const organizations = await this.getAllOrganizations()
      for (const org of organizations) {
        const members = await this.getMembersByOrganization(org.id)
      }
    } catch (error) {
      console.error("❌ Error in debug state:", error)
    }
  },

  // Library functions with caching
  async getLibraryFilesByOrganization(
    organizationId: string,
    filters?: {
      itemType?: string
      className?: string
      documentType?: string
      compositeType?: string
      compositeYear?: string
    },
  ): Promise<LibraryFile[]> {
    if (!organizationId) return []

    const filterKey = filters ? JSON.stringify(filters) : "all"
    const cacheKey = getCacheKey("library_files", organizationId, filterKey)

    return withCache(
      cacheKey,
      async () => {
        let query = supabase
          .from("library_files_new")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })

        // Apply filters
        if (filters?.itemType) {
          query = query.eq("item_type", filters.itemType)
        }
        if (filters?.className) {
          query = query.eq("class_name", filters.className.replace(/\s+/g, "").toUpperCase())
        }
        if (filters?.documentType) {
          query = query.eq("document_type", filters.documentType)
        }
        if (filters?.compositeType) {
          query = query.eq("composite_type", filters.compositeType)
        }
        if (filters?.compositeYear) {
          query = query.eq("composite_year", filters.compositeYear)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch library files: ${error.message}`)
        }

        return (data || []) as LibraryFile[]
      },
      15 * 60 * 1000,
    ) // Cache for 15 minutes
  },

  async getLibraryClasses(organizationId: string): Promise<string[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("library_classes", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("library_files_new")
          .select("class_name")
          .eq("organization_id", organizationId)
          .eq("item_type", "class")
          .not("class_name", "is", null)

        if (error) {
          throw new Error(`Failed to fetch library classes: ${error.message}`)
        }

        // Extract unique class names
        const classNames = [...new Set((data || []).map((item) => item.class_name).filter(Boolean))]
        return classNames.sort()
      },
      30 * 60 * 1000,
    ) // Cache for 30 minutes
  },

  async createGymLocation(locationData: Omit<GymLocation, "id" | "created_at">): Promise<GymLocation> {
    const { data, error } = await supabase.from("gym_locations").insert(locationData).select().single()
    if (error) {
      console.error("❌ Error creating gym location:", error)
      throw new Error(`Failed to create gym location: ${error.message}`)
    }

    // Clear locations cache
    cacheManager.delete(getCacheKey("gym_locations", locationData.organization_id))

    return data as GymLocation
  },

  async updateGymLocation(id: string, updates: Partial<GymLocation>): Promise<GymLocation | null> {
    if (!id) return null
    const { data, error } = await supabase.from("gym_locations").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating gym location:", error)
      throw new Error(`Failed to update gym location: ${error.message}`)
    }

    // Clear caches
    const location = data as GymLocation
    cacheManager.delete(getCacheKey("gym_locations", location.organization_id))
    cacheManager.delete(getCacheKey("gym_location", id))

    return location
  },

  async deleteGymLocation(id: string): Promise<boolean> {
    if (!id) return false

    // Get location info before deletion to clear cache
    const { data: location } = await supabase.from("gym_locations").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("gym_locations").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting gym location:", error)
      throw new Error(`Failed to delete gym location: ${error.message}`)
    }

    // Clear caches
    if (location) {
      cacheManager.delete(getCacheKey("gym_locations", location.organization_id))
      cacheManager.delete(getCacheKey("gym_location", id))
    }

    return true
  },

  async createGymSession(
    sessionData: Omit<
      GymSession,
      "id" | "created_at" | "end_time" | "duration" | "status" | "userName" // Removed location_name from Omit here
    > & {
      location_name: string // Add location_name as a required field
      status?: "active"
    },
  ): Promise<GymSession> {
    const payload = {
      ...sessionData,
      status: sessionData.status || "active",
      duration: 0,
    }
    const { data: insertedData, error } = await supabase
      .from("gym_sessions")
      .insert(payload)
      .select() // Select all columns of the inserted row
      .single()
    if (error) {
      console.error("❌ Error creating gym session:", error)
      throw new Error(`Failed to create gym session: ${error.message}`)
    }
    // Construct the return object. Use sessionData.location_name as the primary source for the name,
    // as this is what was sent for insertion.
    // Merge with insertedData for DB-generated fields like id, created_at.
    return {
      ...insertedData, // Contains id, created_at, user_id, location_id, status, duration, etc.
      location_name: sessionData.location_name, // Ensure we use the name we intended to insert.
    } as GymSession
  },

  async updateGymSession(id: string, updates: Partial<GymSession>): Promise<GymSession | null> {
    if (!id) return null
    const { data, error } = await supabase.from("gym_sessions").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating gym session:", error)
      throw new Error(`Failed to update gym session: ${error.message}`)
    }
    let locationName = "Unknown Location"
    if (data && data.location_id) {
      const loc = await this.getGymLocationById(data.location_id)
      if (loc) locationName = loc.name
    }
    return { ...data, location_name: locationName } as GymSession
  },

  async getGymSessionsByUser(
    userId: string,
    organizationId: string,
    status?: "active" | "completed" | "paused",
  ): Promise<GymSession[]> {
    if (!userId || !organizationId) return []
    let query = supabase
      .from("gym_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: false })
    if (status) {
      query = query.eq("status", status)
    }
    const { data, error } = await query
    if (error) {
      console.error("❌ Error fetching gym sessions by user:", error)
      return []
    }
    const sessionsWithLocationNames = await Promise.all(
      (data || []).map(async (s: any) => {
        let locationName = s.location_name || "Unknown Location"
        if (s.location_id && !s.location_name) {
          const location = await this.getGymLocationById(s.location_id)
          if (location) locationName = location.name
        }
        return { ...s, location_name: locationName }
      }),
    )
    return sessionsWithLocationNames as GymSession[]
  },

  async getLatestGymSession(userId: string, organizationId: string): Promise<GymSession | null> {
    if (!userId || !organizationId) return null
    const { data, error } = await supabase
      .from("gym_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .is("end_time", null)
      .order("start_time", { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching latest gym session:", error)
      return null
    }
    if (!data) return null

    let locationName = data.location_name || "Unknown Location"
    if (data.location_id && !data.location_name) {
      const location = await this.getGymLocationById(data.location_id)
      if (location) locationName = location.name
    }
    return { ...data, location_name: locationName } as GymSession
  },

  async endGymSession(sessionId: string): Promise<{ success: boolean; error?: any; data?: GymSession }> {
    if (!sessionId) {
      console.error("endGymSession: sessionId is required")
      return { success: false, error: new Error("Session ID is required.") }
    }
    try {
      const { data: sessionToUpdate, error: fetchError } = await supabase
        .from("gym_sessions")
        .select("start_time, location_id")
        .eq("id", sessionId)
        .is("end_time", null)
        .single()

      if (fetchError || !sessionToUpdate) {
        console.error("Error fetching active session for duration or session not found/already ended:", fetchError)
        return { success: false, error: fetchError || new Error("Active session not found or already ended.") }
      }

      const startTime = new Date(sessionToUpdate.start_time)
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)

      const { data, error } = await supabase
        .from("gym_sessions")
        .update({
          end_time: endTime.toISOString(),
          status: "completed",
          duration: duration,
        })
        .eq("id", sessionId)
        .select()
        .single()

      if (error) {
        console.error("Error ending gym session:", error)
        return { success: false, error }
      }
      let locationName = "Unknown Location"
      if (data && data.location_id) {
        const loc = await this.getGymLocationById(data.location_id)
        if (loc) locationName = loc.name
      }
      return { success: true, data: { ...data, location_name: locationName } as GymSession }
    } catch (error) {
      console.error("Unexpected error ending gym session:", error)
      return { success: false, error }
    }
  },

  async getGymSessionsByOrganization(organizationId: string): Promise<GymSession[]> {
    if (!organizationId) return []
    const { data, error } = await supabase
      .from("gym_sessions")
      .select("*") // Removed direct join: ", user:members(name)"
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: false })

    if (error) {
      console.error("❌ Error fetching gym sessions for organization:", error)
      // Do not throw here for now, let the page handle empty/error state
      return []
    }

    const sessionsWithDetails = await Promise.all(
      (data || []).map(async (s: any) => {
        let locationName = s.location_name || "Unknown Location"
        if (s.location_id && !s.location_name) {
          const location = await this.getGymLocationById(s.location_id)
          if (location) locationName = location.name
        }
        let userName = s.userName || "Unknown User"
        if (s.user_id && !s.userName) {
          // Fetch member name if user_id exists and userName isn't already populated
          const member = await this.getMemberById(s.user_id)
          if (member) userName = member.name
        }
        return {
          ...s,
          userName: userName,
          location_name: locationName,
        }
      }),
    )
    return sessionsWithDetails as GymSession[]
  },

  async getGymLocationById(locationId: string): Promise<GymLocation | null> {
    if (!locationId) return null

    const cacheKey = getCacheKey("gym_location", locationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("gym_locations").select("id, name").eq("id", locationId).single()

        if (error) {
          console.error(`Error fetching gym location by ID ${locationId}:`, error)
          return null
        }

        return data as GymLocation | null
      },
      30 * 60 * 1000,
    )
  },

  async getGymLocationsByOrganization(organizationId: string): Promise<GymLocation[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("gym_locations", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase.from("gym_locations").select("*").eq("organization_id", organizationId)

        if (error) {
          throw new Error(`Failed to fetch gym locations: ${error.message}`)
        }

        const processedData = (data || []).map((location: any) => {
          let parsedBoxCoordinates = location.box_coordinates
          if (location.box_coordinates && typeof location.box_coordinates === "string") {
            try {
              parsedBoxCoordinates = JSON.parse(location.box_coordinates)
            } catch (e) {
              console.error("Failed to parse box_coordinates for location:", location.id, e)
              parsedBoxCoordinates = null
            }
          }
          return { ...location, box_coordinates: parsedBoxCoordinates }
        })

        return processedData as GymLocation[]
      },
      30 * 60 * 1000,
    ) // Cache for 30 minutes
  },

  async getLocationsByOrg(organizationId: string): Promise<GymLocation[]> {
    // Alias for consistency
    return this.getGymLocationsByOrganization(organizationId)
  },

  async createGymLocation(locationData: Omit<GymLocation, "id" | "created_at">): Promise<GymLocation> {
    const { data, error } = await supabase.from("gym_locations").insert(locationData).select().single()
    if (error) {
      console.error("❌ Error creating gym location:", error)
      throw new Error(`Failed to create gym location: ${error.message}`)
    }

    // Clear locations cache
    cacheManager.delete(getCacheKey("gym_locations", locationData.organization_id))

    return data as GymLocation
  },

  async updateGymLocation(id: string, updates: Partial<GymLocation>): Promise<GymLocation | null> {
    if (!id) return null
    const { data, error } = await supabase.from("gym_locations").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating gym location:", error)
      throw new Error(`Failed to update gym location: ${error.message}`)
    }

    // Clear caches
    const location = data as GymLocation
    cacheManager.delete(getCacheKey("gym_locations", location.organization_id))
    cacheManager.delete(getCacheKey("gym_location", id))

    return location
  },

  async deleteGymLocation(id: string): Promise<boolean> {
    if (!id) return false

    // Get location info before deletion to clear cache
    const { data: location } = await supabase.from("gym_locations").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("gym_locations").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting gym location:", error)
      throw new Error(`Failed to delete gym location: ${error.message}`)
    }

    // Clear caches
    if (location) {
      cacheManager.delete(getCacheKey("gym_locations", location.organization_id))
      cacheManager.delete(getCacheKey("gym_location", id))
    }

    return true
  },

  async createHour(hourData: Omit<Hour, "id" | "created_at">): Promise<Hour> {
    const hourPayload = { ...hourData }
    if (!hourPayload.user_name && hourPayload.user_id) {
      try {
        const member = await this.getMemberById(hourPayload.user_id)
        if (member) {
          hourPayload.user_name = member.name
        }
      } catch (error) {
        console.warn("Could not fetch member name for hour creation:", error)
      }
    }

    const { data, error } = await supabase.from("hours").insert(hourPayload).select().single()
    if (error) {
      throw new Error(`Failed to create hour: ${error.message}`)
    }

    // Invalidate hours cache
    invalidateOrganizationCache(hourData.organization_id)

    return data as Hour
  },

  async getHoursByOrganization(organizationId: string): Promise<Hour[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("hours", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("hours")
          .select("*")
          .eq("organization_id", organizationId)
          .order("date", { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch hours: ${error.message}`)
        }

        return (data || []) as Hour[]
      },
      5 * 60 * 1000,
    )
  },

  async getHoursByUser(userId: string, organizationId: string): Promise<Hour[]> {
    if (!userId || !organizationId) return []

    const cacheKey = getCacheKey("user_hours", userId, organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("hours")
          .select("*")
          .eq("user_id", userId)
          .eq("organization_id", organizationId)
          .order("date", { ascending: false })

        if (error) {
          throw new Error(`Failed to fetch user hours: ${error.message}`)
        }

        return (data || []) as Hour[]
      },
      5 * 60 * 1000,
    )
  },

  /**
   * Fetch every Hour row belonging to a single member (any organisation).
   * A lightweight alias used by the Members dashboard.
   */
  async getMemberHours(memberId: string): Promise<Hour[]> {
    if (!memberId) return []

    try {
      const { data, error } = await supabase
        .from("hours")
        .select("*")
        .eq("user_id", memberId)
        .order("date", { ascending: false })

      if (error) {
        console.error(`❌ Error fetching hours for member ${memberId}:`, error)
        return []
      }

      return (data || []) as Hour[]
    } catch (err) {
      console.error(`❌ Unexpected error fetching hours for member ${memberId}:`, err)
      return []
    }
  },

  async updateHour(id: string, updates: Partial<Hour>): Promise<Hour | null> {
    if (!id) return null
    const { data, error } = await supabase.from("hours").update(updates).eq("id", id).select().single()
    if (error) {
      console.error("❌ Error updating hour:", error)
      throw new Error(`Failed to update hour: ${error.message}`)
    }

    // Clear hours cache
    const hour = data as Hour
    cacheManager.delete(getCacheKey("hours", hour.organization_id))

    return hour
  },

  async deleteHour(id: string): Promise<boolean> {
    if (!id) return false

    // Get hour info before deletion to clear cache
    const { data: hour } = await supabase.from("hours").select("organization_id").eq("id", id).single()

    const { error } = await supabase.from("hours").delete().eq("id", id)
    if (error) {
      console.error("❌ Error deleting hour:", error)
      throw new Error(`Failed to delete hour: ${error.message}`)
    }

    // Clear cache
    if (hour) {
      cacheManager.delete(getCacheKey("hours", hour.organization_id))
    }

    return true
  },

  async getUserConversations(userId: string, organizationId: string): Promise<any[]> {
    if (!userId || !organizationId) return []

    // Get direct messages
    const { data: directMessages, error: directError } = await supabase
      .from("messages")
      .select("*")
      .eq("organization_id", organizationId)
      .is("group_chat_id", null) // Only direct messages
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: false })

    if (directError) {
      console.error("❌ Error fetching direct messages:", directError)
      throw new Error(`Failed to fetch direct messages: ${directError.message}`)
    }

    // Get group chat messages for groups the user is in
    const { data: userGroupChats, error: groupError } = await supabase
      .from("group_chat_members")
      .select(`
      group_chat_id,
      group_chats(*)
    `)
      .eq("member_id", userId)

    if (groupError) {
      console.error("❌ Error fetching user group chats:", groupError)
      throw new Error(`Failed to fetch user group chats: ${groupError.message}`)
    }

    const conversations = []

    // Process direct messages
    const directConversationsMap = {}

    for (const message of (directMessages || []) as Message[]) {
      // For direct messages, determine the other user's ID
      const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id
      if (!otherUserId) continue

      // Use the other user's ID as the conversation ID
      if (!directConversationsMap[otherUserId]) {
        directConversationsMap[otherUserId] = {
          id: otherUserId, // Use the other user's ID directly as the conversation ID
          type: "direct",
          participants: [userId, otherUserId],
          lastMessage: message,
          messages: [message],
        }
      } else {
        directConversationsMap[otherUserId].messages.push(message)
        if (new Date(message.created_at) > new Date(directConversationsMap[otherUserId].lastMessage.created_at)) {
          directConversationsMap[otherUserId].lastMessage = message
        }
      }
    }

    conversations.push(...Object.values(directConversationsMap))

    // Process group chats
    for (const groupChatData of userGroupChats || []) {
      const groupChatId = groupChatData.group_chat_id
      const groupChat = groupChatData.group_chats
      if (!groupChat) continue

      // Get messages for this group chat
      const { data: groupMessages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("group_chat_id", groupChatId)
        .order("created_at", { ascending: false })

      if (messagesError) {
        console.error("❌ Error fetching group messages:", messagesError)
        continue
      }

      const messages = (groupMessages || []) as Message[]
      if (messages.length > 0) {
        conversations.push({
          id: `group-${groupChatId}`,
          type: "group",
          groupChat: groupChat,
          lastMessage: messages[0],
          messages: messages.reverse(), // Reverse to get chronological order
        })
      } else {
        // Include group chats even if they have no messages yet
        conversations.push({
          id: `group-${groupChatId}`,
          type: "group",
          groupChat: groupChat,
          lastMessage: null,
          messages: [],
        })
      }
    }

    return conversations.sort((a: any, b: any) => {
      if (!a.lastMessage && !b.lastMessage) return 0
      if (!a.lastMessage) return 1
      if (!b.lastMessage) return -1
      return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    })
  },

  async removeGroupChatMember(groupChatId: string, memberId: string): Promise<boolean> {
    if (!groupChatId || !memberId) return false

    const { error } = await supabase
      .from("group_chat_members")
      .delete()
      .eq("group_chat_id", groupChatId)
      .eq("member_id", memberId)

    if (error) {
      console.error("❌ Error removing group chat member:", error)
      throw new Error(`Failed to remove group chat member: ${error.message}`)
    }

    return true
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    if (!messageId) return false

    const { error } = await supabase.from("messages").delete().eq("id", messageId)

    if (error) {
      console.error("❌ Error deleting message:", error)
      throw new Error(`Failed to delete message: ${error.message}`)
    }

    return true
  },

  async deleteDirectConversation(userId1: string, userId2: string, organizationId: string): Promise<boolean> {
    if (!userId1 || !userId2 || !organizationId) return false

    // Delete all messages between the two users
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("organization_id", organizationId)
      .is("group_chat_id", null)
      .or(
        `and(sender_id.eq.${userId1},recipient_id.eq.${userId2}),and(sender_id.eq.${userId2},recipient_id.eq.${userId1})`,
      )

    if (error) {
      console.error("❌ Error deleting direct conversation messages:", error)
      throw new Error(`Failed to delete direct conversation: ${error.message}`)
    }

    return true
  },

  async deleteGroupChat(groupChatId: string): Promise<boolean> {
    if (!groupChatId) return false

    console.log("🗑️ Deleting group chat:", groupChatId)

    try {
      // Delete all messages in the group chat
      const { error: messagesError } = await supabase.from("messages").delete().eq("group_chat_id", groupChatId)

      if (messagesError) {
        console.error("❌ Error deleting group chat messages:", messagesError)
        throw new Error(`Failed to delete group chat messages: ${messagesError.message}`)
      }

      // Delete all group chat members
      const { error: membersError } = await supabase
        .from("group_chat_members")
        .delete()
        .eq("group_chat_id", groupChatId)

      if (membersError) {
        console.error("❌ Error deleting group chat members:", membersError)
        throw new Error(`Failed to delete group chat members: ${membersError.message}`)
      }

      // Delete the group chat itself
      const { error: groupChatError } = await supabase.from("group_chats").delete().eq("id", groupChatId)

      if (groupChatError) {
        console.error("❌ Error deleting group chat:", groupChatError)
        throw new Error(`Failed to delete group chat: ${groupChatError.message}`)
      }

      return true
    } catch (error) {
      console.error("❌ Error in deleteGroupChat:", error)
      throw error
    }
  },

  async debugState(): Promise<void> {
    try {
      const organizations = await this.getAllOrganizations()
      for (const org of organizations) {
        const members = await this.getMembersByOrganization(org.id)
      }
    } catch (error) {
      console.error("❌ Error in debug state:", error)
    }
  },

  // Library functions with caching
  async getLibraryFilesByOrganization(
    organizationId: string,
    filters?: {
      itemType?: string
      className?: string
      documentType?: string
      compositeType?: string
      compositeYear?: string
    },
  ): Promise<LibraryFile[]> {
    if (!organizationId) return []

    const filterKey = filters ? JSON.stringify(filters) : "all"
    const cacheKey = getCacheKey("library_files", organizationId, filterKey)

    return withCache(
      cacheKey,
      async () => {
        let query = supabase
          .from("library_files_new")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })

        // Apply filters
        if (filters?.itemType) {
          query = query.eq("item_type", filters.itemType)
        }
        if (filters?.className) {
          query = query.eq("class_name", filters.className.replace(/\s+/g, "").toUpperCase())
        }
        if (filters?.documentType) {
          query = query.eq("document_type", filters.documentType)
        }
        if (filters?.compositeType) {
          query = query.eq("composite_type", filters.compositeType)
        }
        if (filters?.compositeYear) {
          query = query.eq("composite_year", filters.compositeYear)
        }

        const { data, error } = await query

        if (error) {
          throw new Error(`Failed to fetch library files: ${error.message}`)
        }

        return (data || []) as LibraryFile[]
      },
      15 * 60 * 1000,
    ) // Cache for 15 minutes
  },

  async getLibraryClasses(organizationId: string): Promise<string[]> {
    if (!organizationId) return []

    const cacheKey = getCacheKey("library_classes", organizationId)

    return withCache(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("library_files_new")
          .select("class_name")
          .eq("organization_id", organizationId)
          .eq("item_type", "class")
          .not("class_name", "is", null)

        if (error) {
          throw new Error(`Failed to fetch library classes: ${error.message}`)
        }

        // Extract unique class names
        const classNames = [...new Set((data || []).map((item) => item.class_name).filter(Boolean))]
        return classNames.sort()
      },
      30 * 60 * 1000,
    ) // Cache for 30 minutes
  },
  supabase, // Export the supabase client for direct access
}
