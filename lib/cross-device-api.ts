// Improved cross-device API with better fallback and migration
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

interface Database {
  organizations: Organization[]
  members: Member[]
  lastSync: string
  version: string
}

// Enhanced localStorage-based system with better cross-device simulation
class CrossDeviceAPI {
  private readonly STORAGE_KEY = "greeky_cross_device_database"
  private readonly LEGACY_ORGS_KEY = "organizations"
  private readonly LEGACY_MEMBERS_KEY = "members"
  private readonly LEGACY_GLOBAL_KEY = "greeky_global_database"

  // Get database with comprehensive migration
  async getData(): Promise<Database> {
    const database: Database = {
      organizations: [],
      members: [],
      lastSync: new Date().toISOString(),
      version: "2.0",
    }

    try {
      // First, try to load from the new storage key
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.version) {
          console.log("✅ Loaded from cross-device storage:", {
            organizations: parsed.organizations?.length || 0,
            members: parsed.members?.length || 0,
          })
          return parsed
        }
      }

      // Migration: Check all possible legacy storage locations
      await this.migrateLegacyData(database)

      // Save the migrated data
      await this.saveData(database)

      return database
    } catch (error) {
      console.error("Error loading database:", error)
      return database
    }
  }

  // Comprehensive migration from all legacy storage formats
  private async migrateLegacyData(database: Database): Promise<void> {
    let migrationCount = 0

    // 1. Migrate from legacy global database
    try {
      const globalData = localStorage.getItem(this.LEGACY_GLOBAL_KEY)
      if (globalData) {
        const parsed = JSON.parse(globalData)
        if (parsed.organizations) {
          parsed.organizations.forEach((org) => {
            if (org && org.groupId && !database.organizations.find((existing) => existing.groupId === org.groupId)) {
              database.organizations.push(org)
              migrationCount++
              console.log("🔄 Migrated organization from global:", org.groupId)
            }
          })
        }
        if (parsed.members) {
          parsed.members.forEach((member) => {
            if (member && member.email && !database.members.find((existing) => existing.email === member.email)) {
              database.members.push(member)
              migrationCount++
              console.log("🔄 Migrated member from global:", member.email)
            }
          })
        }
      }
    } catch (e) {
      console.warn("Failed to migrate from global database:", e)
    }

    // 2. Migrate from legacy organizations
    try {
      const orgsData = localStorage.getItem(this.LEGACY_ORGS_KEY)
      if (orgsData) {
        const orgs = JSON.parse(orgsData)
        if (Array.isArray(orgs)) {
          orgs.forEach((org) => {
            if (org && org.groupId && !database.organizations.find((existing) => existing.groupId === org.groupId)) {
              database.organizations.push(org)
              migrationCount++
              console.log("🔄 Migrated organization from legacy:", org.groupId)
            }
          })
        }
      }
    } catch (e) {
      console.warn("Failed to migrate legacy organizations:", e)
    }

    // 3. Migrate from legacy members
    try {
      const membersData = localStorage.getItem(this.LEGACY_MEMBERS_KEY)
      if (membersData) {
        const members = JSON.parse(membersData)
        if (Array.isArray(members)) {
          members.forEach((member) => {
            if (member && member.email && !database.members.find((existing) => existing.email === member.email)) {
              database.members.push(member)
              migrationCount++
              console.log("🔄 Migrated member from legacy:", member.email)
            }
          })
        }
      }
    } catch (e) {
      console.warn("Failed to migrate legacy members:", e)
    }

    if (migrationCount > 0) {
      console.log(`✅ Migration completed: ${migrationCount} items migrated`)
    }
  }

  // Save data to storage
  async saveData(data: Database): Promise<boolean> {
    try {
      data.lastSync = new Date().toISOString()
      data.version = "2.0"

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))

      // Also update legacy storage for backward compatibility
      localStorage.setItem(this.LEGACY_ORGS_KEY, JSON.stringify(data.organizations))
      localStorage.setItem(this.LEGACY_MEMBERS_KEY, JSON.stringify(data.members))

      console.log("💾 Saved data successfully:", {
        organizations: data.organizations.length,
        members: data.members.length,
      })

      return true
    } catch (error) {
      console.error("Failed to save data:", error)
      return false
    }
  }
}

// Create singleton instance
const crossDeviceAPI = new CrossDeviceAPI()

// Export the API functions
export const api = {
  // Organizations
  async createOrganization(org: Omit<Organization, "id" | "createdAt">): Promise<Organization> {
    const data = await crossDeviceAPI.getData()

    const newOrg: Organization = {
      ...org,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }

    data.organizations.push(newOrg)
    await crossDeviceAPI.saveData(data)

    return newOrg
  },

  async getOrganizationByGroupId(groupId: string): Promise<Organization | null> {
    if (!groupId) return null

    const data = await crossDeviceAPI.getData()
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

    const data = await crossDeviceAPI.getData()
    return data.organizations.find((org) => org && org.id === id) || null
  },

  async getAllOrganizations(): Promise<Organization[]> {
    const data = await crossDeviceAPI.getData()
    return data.organizations
  },

  // Members
  async createMember(member: Omit<Member, "id" | "joinDate">): Promise<Member> {
    const data = await crossDeviceAPI.getData()

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
    await crossDeviceAPI.saveData(data)

    console.log("👤 Created new member:", newMember.email, "Approved:", newMember.approved)

    return newMember
  },

  async getMemberByEmail(email: string): Promise<Member | null> {
    if (!email) return null

    const data = await crossDeviceAPI.getData()
    return data.members.find((member) => member && member.email === email) || null
  },

  async getMembersByOrganization(organizationId: string): Promise<Member[]> {
    if (!organizationId) return []

    const data = await crossDeviceAPI.getData()
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

    const data = await crossDeviceAPI.getData()
    const memberIndex = data.members.findIndex((member) => member && member.id === id)

    if (memberIndex === -1) {
      return null
    }

    data.members[memberIndex] = { ...data.members[memberIndex], ...updates }
    await crossDeviceAPI.saveData(data)

    console.log("✏️ Updated member:", data.members[memberIndex].email, updates)

    return data.members[memberIndex]
  },

  async deleteMember(id: string): Promise<boolean> {
    if (!id) return false

    const data = await crossDeviceAPI.getData()
    const initialLength = data.members.length
    data.members = data.members.filter((member) => member && member.id !== id)

    if (data.members.length < initialLength) {
      await crossDeviceAPI.saveData(data)
      console.log("🗑️ Deleted member:", id)
      return true
    }

    return false
  },

  // Utility functions
  async migrateLocalData(): Promise<void> {
    // This is now handled automatically in getData()
    await crossDeviceAPI.getData()
  },

  async syncLocalData(): Promise<void> {
    const data = await crossDeviceAPI.getData()
    // Data is already synced through the unified storage system
    console.log("🔄 Data synced:", {
      organizations: data.organizations.length,
      members: data.members.length,
    })
  },

  async debugState(): Promise<void> {
    const data = await crossDeviceAPI.getData()
    console.log("=== CROSS-DEVICE DATABASE STATE ===")
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
    console.log("=== END DEBUG ===")
  },

  async forceMigration(): Promise<void> {
    // Force a fresh migration
    const database = {
      organizations: [],
      members: [],
      lastSync: new Date().toISOString(),
      version: "2.0",
    }

    const api = new CrossDeviceAPI()
    await (api as any).migrateLegacyData(database)
    await crossDeviceAPI.saveData(database)

    console.log("🔄 Forced migration completed")
  },
}
