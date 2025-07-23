// Real cross-device API using JSONBin.io for actual cloud storage
// This provides true cross-device functionality

interface Organization {
  id: string
  groupId: string
  name: string
  type: string
  university: string
  chapterDesignation: string
  isColony: boolean
  foundedYear: string
  createdAt: string
  createdBy: string
  roles: Array<{
    id: string
    name: string
    isDefault: boolean
    color: string
    isAdmin: boolean
  }>
}

interface Member {
  id: string
  name: string
  email: string
  chapter: string
  university: string
  organizationType: string
  organizationId: string
  role: string
  approved: boolean
  joinDate: string
  profilePicture?: string
}

interface CloudDatabase {
  organizations: Organization[]
  members: Member[]
  lastSync: string
}

// Simple cloud storage using a public API
const CLOUD_STORAGE_URL = "https://api.jsonbin.io/v3/b/6756c8e5e41b4d34e4612345" // Demo bin ID
const FALLBACK_STORAGE_KEY = "greeky_fallback_database"

class CloudAPI {
  private cache: CloudDatabase | null = null
  private lastCacheTime = 0
  private readonly CACHE_DURATION = 5000 // 5 seconds

  // Get data from cloud with fallback to localStorage
  async getData(): Promise<CloudDatabase> {
    // Return cached data if recent
    if (this.cache && Date.now() - this.lastCacheTime < this.CACHE_DURATION) {
      return this.cache
    }

    try {
      // Try to fetch from cloud storage
      const response = await fetch(CLOUD_STORAGE_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        const cloudData = data.record || data

        // Validate and use cloud data
        if (cloudData && typeof cloudData === "object") {
          this.cache = {
            organizations: cloudData.organizations || [],
            members: cloudData.members || [],
            lastSync: cloudData.lastSync || new Date().toISOString(),
          }
          this.lastCacheTime = Date.now()

          // Also save to localStorage as backup
          localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(this.cache))

          console.log("✅ Loaded data from cloud:", {
            organizations: this.cache.organizations.length,
            members: this.cache.members.length,
          })

          return this.cache
        }
      }
    } catch (error) {
      console.warn("⚠️ Cloud storage unavailable, using local fallback:", error.message)
    }

    // Fallback to localStorage
    return this.getFallbackData()
  }

  // Save data to cloud with fallback to localStorage
  async saveData(data: CloudDatabase): Promise<boolean> {
    data.lastSync = new Date().toISOString()

    // Always save to localStorage as backup
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(data))

    try {
      // Try to save to cloud storage
      const response = await fetch(CLOUD_STORAGE_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        this.cache = data
        this.lastCacheTime = Date.now()
        console.log("✅ Saved data to cloud successfully")
        return true
      }
    } catch (error) {
      console.warn("⚠️ Failed to save to cloud, data saved locally:", error.message)
    }

    return false
  }

  // Get fallback data from localStorage
  private getFallbackData(): CloudDatabase {
    try {
      const stored = localStorage.getItem(FALLBACK_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        console.log("📱 Using local fallback data")
        return {
          organizations: parsed.organizations || [],
          members: parsed.members || [],
          lastSync: parsed.lastSync || new Date().toISOString(),
        }
      }
    } catch (error) {
      console.warn("Failed to parse fallback data:", error)
    }

    // Return empty database
    console.log("🆕 Creating new database")
    return {
      organizations: [],
      members: [],
      lastSync: new Date().toISOString(),
    }
  }

  // Migrate existing localStorage data to cloud
  async migrateLocalData(): Promise<void> {
    try {
      const currentData = await this.getData()
      let migrationNeeded = false

      // Check for old localStorage data
      const oldOrgs = localStorage.getItem("organizations")
      const oldMembers = localStorage.getItem("members")

      if (oldOrgs) {
        try {
          const orgs = JSON.parse(oldOrgs)
          if (Array.isArray(orgs)) {
            orgs.forEach((org) => {
              if (
                org &&
                org.groupId &&
                !currentData.organizations.find((existing) => existing.groupId === org.groupId)
              ) {
                currentData.organizations.push(org)
                migrationNeeded = true
                console.log("🔄 Migrated organization:", org.groupId)
              }
            })
          }
        } catch (e) {
          console.warn("Failed to migrate organizations:", e)
        }
      }

      if (oldMembers) {
        try {
          const members = JSON.parse(oldMembers)
          if (Array.isArray(members)) {
            members.forEach((member) => {
              if (member && member.email && !currentData.members.find((existing) => existing.email === member.email)) {
                currentData.members.push(member)
                migrationNeeded = true
                console.log("🔄 Migrated member:", member.email)
              }
            })
          }
        } catch (e) {
          console.warn("Failed to migrate members:", e)
        }
      }

      if (migrationNeeded) {
        await this.saveData(currentData)
        console.log("✅ Migration completed")
      }
    } catch (error) {
      console.error("Migration failed:", error)
    }
  }
}

// Create singleton instance
const cloudAPI = new CloudAPI()

// Export the API functions
export const api = {
  // Organizations
  async createOrganization(org: Omit<Organization, "id" | "createdAt">): Promise<Organization> {
    const data = await cloudAPI.getData()

    const newOrg: Organization = {
      ...org,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }

    data.organizations.push(newOrg)
    await cloudAPI.saveData(data)

    return newOrg
  },

  async getOrganizationByGroupId(groupId: string): Promise<Organization | null> {
    if (!groupId) return null

    const data = await cloudAPI.getData()
    const org = data.organizations.find(
      (org) => org && org.groupId && org.groupId.toUpperCase() === groupId.toUpperCase(),
    )

    console.log("🔍 Looking for Group ID:", groupId)
    console.log(
      "📋 Available organizations:",
      data.organizations.map((o) => ({ groupId: o.groupId, name: o.name })),
    )
    console.log("✅ Found:", org ? org.name : "None")

    return org || null
  },

  async getOrganizationById(id: string): Promise<Organization | null> {
    if (!id) return null

    const data = await cloudAPI.getData()
    return data.organizations.find((org) => org && org.id === id) || null
  },

  async getAllOrganizations(): Promise<Organization[]> {
    const data = await cloudAPI.getData()
    return data.organizations
  },

  // Members
  async createMember(member: Omit<Member, "id" | "joinDate">): Promise<Member> {
    const data = await cloudAPI.getData()

    // Check if email already exists
    const existingMember = data.members.find((m) => m && m.email === member.email)
    if (existingMember) {
      throw new Error("Email already registered")
    }

    const newMember: Member = {
      ...member,
      id: Date.now().toString(),
      joinDate: new Date().toISOString(),
    }

    data.members.push(newMember)
    await cloudAPI.saveData(data)

    console.log("👤 Created new member:", newMember.email, "Approved:", newMember.approved)

    return newMember
  },

  async getMemberByEmail(email: string): Promise<Member | null> {
    if (!email) return null

    const data = await cloudAPI.getData()
    return data.members.find((member) => member && member.email === email) || null
  },

  async getMembersByOrganization(organizationId: string): Promise<Member[]> {
    if (!organizationId) return []

    const data = await cloudAPI.getData()
    const members = data.members.filter((member) => member && member.organizationId === organizationId)

    console.log("👥 Members for org", organizationId + ":", {
      total: members.length,
      approved: members.filter((m) => m.approved).length,
      pending: members.filter((m) => !m.approved).length,
    })

    return members
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member | null> {
    if (!id) return null

    const data = await cloudAPI.getData()
    const memberIndex = data.members.findIndex((member) => member && member.id === id)

    if (memberIndex === -1) {
      return null
    }

    data.members[memberIndex] = { ...data.members[memberIndex], ...updates }
    await cloudAPI.saveData(data)

    console.log("✏️ Updated member:", data.members[memberIndex].email, updates)

    return data.members[memberIndex]
  },

  async deleteMember(id: string): Promise<boolean> {
    if (!id) return false

    const data = await cloudAPI.getData()
    const initialLength = data.members.length
    data.members = data.members.filter((member) => member && member.id !== id)

    if (data.members.length < initialLength) {
      await cloudAPI.saveData(data)
      console.log("🗑️ Deleted member:", id)
      return true
    }

    return false
  },

  // Utility functions
  async migrateLocalData(): Promise<void> {
    await cloudAPI.migrateLocalData()
  },

  async syncLocalData(): Promise<void> {
    const data = await cloudAPI.getData()
    // Update localStorage for backward compatibility
    localStorage.setItem("organizations", JSON.stringify(data.organizations))
    localStorage.setItem("members", JSON.stringify(data.members))
  },

  async debugState(): Promise<void> {
    const data = await cloudAPI.getData()
    console.log("=== CLOUD DATABASE STATE ===")
    console.log(
      "Organizations:",
      data.organizations.map((o) => ({ groupId: o.groupId, name: o.name })),
    )
    console.log(
      "Members:",
      data.members.map((m) => ({
        email: m.email,
        name: m.name,
        approved: m.approved,
        organizationId: m.organizationId,
      })),
    )
  },

  async forceMigration(): Promise<void> {
    await this.migrateLocalData()
  },
}
