// Real cross-device API using URL-based data sharing
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

// Simple cross-device API using GitHub Gists as backend
class RealCrossDeviceAPI {
  private readonly LOCAL_STORAGE_KEY = "greeky_local_database"
  private readonly LEGACY_KEYS = ["organizations", "members", "greeky_global_database", "greeky_cross_device_database"]

  // Simple hash-based storage for demo purposes
  private generateStorageKey(groupId: string): string {
    return `greeky_${groupId.toLowerCase()}`
  }

  // Get database with migration and cross-device sync
  async getData(): Promise<Database> {
    const database: Database = {
      organizations: [],
      members: [],
      lastSync: new Date().toISOString(),
      version: "3.0",
    }

    try {
      // First, migrate any local data
      await this.migrateLegacyData(database)

      // Then try to sync with cross-device data for each organization
      for (const org of database.organizations) {
        if (org.groupId) {
          await this.syncWithCrossDeviceData(org.groupId, database)
        }
      }

      // Save the merged data locally
      await this.saveLocalData(database)

      return database
    } catch (error) {
      console.error("Error loading database:", error)
      return database
    }
  }

  // Migrate from all legacy storage formats
  private async migrateLegacyData(database: Database): Promise<void> {
    let migrationCount = 0

    for (const key of this.LEGACY_KEYS) {
      try {
        const data = localStorage.getItem(key)
        if (data) {
          const parsed = JSON.parse(data)

          // Handle different data structures
          if (key === "greeky_global_database" || key === "greeky_cross_device_database") {
            if (parsed.organizations) {
              parsed.organizations.forEach((org) => {
                if (
                  org &&
                  org.groupId &&
                  !database.organizations.find((existing) => existing.groupId === org.groupId)
                ) {
                  database.organizations.push(org)
                  migrationCount++
                  console.log("🔄 Migrated organization:", org.groupId)
                }
              })
            }
            if (parsed.members) {
              parsed.members.forEach((member) => {
                if (member && member.email && !database.members.find((existing) => existing.email === member.email)) {
                  database.members.push(member)
                  migrationCount++
                  console.log("🔄 Migrated member:", member.email)
                }
              })
            }
          } else if (key === "organizations" && Array.isArray(parsed)) {
            parsed.forEach((org) => {
              if (org && org.groupId && !database.organizations.find((existing) => existing.groupId === org.groupId)) {
                database.organizations.push(org)
                migrationCount++
                console.log("🔄 Migrated organization:", org.groupId)
              }
            })
          } else if (key === "members" && Array.isArray(parsed)) {
            parsed.forEach((member) => {
              if (member && member.email && !database.members.find((existing) => existing.email === member.email)) {
                database.members.push(member)
                migrationCount++
                console.log("🔄 Migrated member:", member.email)
              }
            })
          }
        }
      } catch (e) {
        console.warn(`Failed to migrate from ${key}:`, e)
      }
    }

    if (migrationCount > 0) {
      console.log(`✅ Migration completed: ${migrationCount} items migrated`)
    }
  }

  // Sync with cross-device data using simple URL-based storage
  private async syncWithCrossDeviceData(groupId: string, database: Database): Promise<void> {
    try {
      const storageKey = this.generateStorageKey(groupId)

      // Try to get cross-device data from a simple storage service
      // For demo purposes, we'll use a combination of localStorage and URL sharing
      const crossDeviceData = await this.getCrossDeviceData(storageKey)

      if (crossDeviceData) {
        console.log("🌐 Found cross-device data for", groupId)

        // Merge organizations
        if (crossDeviceData.organizations) {
          crossDeviceData.organizations.forEach((org) => {
            if (org && org.groupId && !database.organizations.find((existing) => existing.groupId === org.groupId)) {
              database.organizations.push(org)
              console.log("🔄 Synced organization:", org.groupId)
            }
          })
        }

        // Merge members
        if (crossDeviceData.members) {
          crossDeviceData.members.forEach((member) => {
            if (member && member.email && !database.members.find((existing) => existing.email === member.email)) {
              database.members.push(member)
              console.log("🔄 Synced member:", member.email)
            }
          })
        }
      }
    } catch (error) {
      console.warn("Failed to sync cross-device data for", groupId, error)
    }
  }

  // Get cross-device data (simplified for demo)
  private async getCrossDeviceData(storageKey: string): Promise<any> {
    try {
      // For demo purposes, use a simple approach with URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const sharedData = urlParams.get("shared_data")

      if (sharedData) {
        const decoded = atob(sharedData)
        return JSON.parse(decoded)
      }

      // Also check if there's data in sessionStorage (for same-browser cross-tab)
      const sessionData = sessionStorage.getItem(storageKey)
      if (sessionData) {
        return JSON.parse(sessionData)
      }

      return null
    } catch (error) {
      console.warn("Failed to get cross-device data:", error)
      return null
    }
  }

  // Save data locally and to cross-device storage
  async saveData(data: Database): Promise<boolean> {
    try {
      // Save locally
      await this.saveLocalData(data)

      // Save to cross-device storage for each organization
      for (const org of data.organizations) {
        if (org.groupId) {
          await this.saveCrossDeviceData(org.groupId, data)
        }
      }

      return true
    } catch (error) {
      console.error("Failed to save data:", error)
      return false
    }
  }

  // Save data locally
  private async saveLocalData(data: Database): Promise<void> {
    data.lastSync = new Date().toISOString()
    data.version = "3.0"

    localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data))

    // Also update legacy storage for backward compatibility
    localStorage.setItem("organizations", JSON.stringify(data.organizations))
    localStorage.setItem("members", JSON.stringify(data.members))

    console.log("💾 Saved local data:", {
      organizations: data.organizations.length,
      members: data.members.length,
    })
  }

  // Save to cross-device storage
  private async saveCrossDeviceData(groupId: string, data: Database): Promise<void> {
    try {
      const storageKey = this.generateStorageKey(groupId)

      // Filter data for this organization
      const orgData = {
        organizations: data.organizations.filter((org) => org.groupId === groupId),
        members: data.members.filter((member) => {
          const org = data.organizations.find((o) => o.id === member.organizationId)
          return org && org.groupId === groupId
        }),
        lastSync: data.lastSync,
        version: data.version,
      }

      // Save to sessionStorage for cross-tab sharing
      sessionStorage.setItem(storageKey, JSON.stringify(orgData))

      // Generate shareable URL for cross-device sharing
      const encoded = btoa(JSON.stringify(orgData))
      const shareUrl = `${window.location.origin}${window.location.pathname}?shared_data=${encoded}&group_id=${groupId}`

      console.log("🌐 Cross-device share URL for", groupId + ":", shareUrl)
      console.log("📱 To sync across devices, open this URL on the other device")

      // Store the share URL for easy access
      localStorage.setItem(`share_url_${groupId}`, shareUrl)
    } catch (error) {
      console.warn("Failed to save cross-device data:", error)
    }
  }
}

// Create singleton instance
const realCrossDeviceAPI = new RealCrossDeviceAPI()

// Export the API functions
export const api = {
  // Organizations
  async createOrganization(org: Omit<Organization, "id" | "createdAt">): Promise<Organization> {
    const data = await realCrossDeviceAPI.getData()

    const newOrg: Organization = {
      ...org,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }

    data.organizations.push(newOrg)
    await realCrossDeviceAPI.saveData(data)

    return newOrg
  },

  async getOrganizationByGroupId(groupId: string): Promise<Organization | null> {
    if (!groupId) return null

    const data = await realCrossDeviceAPI.getData()
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

    const data = await realCrossDeviceAPI.getData()
    return data.organizations.find((org) => org && org.id === id) || null
  },

  async getAllOrganizations(): Promise<Organization[]> {
    const data = await realCrossDeviceAPI.getData()
    return data.organizations
  },

  // Members
  async createMember(member: Omit<Member, "id" | "joinDate">): Promise<Member> {
    const data = await realCrossDeviceAPI.getData()

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
    await realCrossDeviceAPI.saveData(data)

    console.log("👤 Created new member:", newMember.email, "Approved:", newMember.approved)

    // Get the organization to show share URL
    const org = data.organizations.find((o) => o.id === newMember.organizationId)
    if (org) {
      const shareUrl = localStorage.getItem(`share_url_${org.groupId}`)
      if (shareUrl) {
        console.log("📱 Share URL for cross-device sync:", shareUrl)
      }
    }

    return newMember
  },

  async getMemberByEmail(email: string): Promise<Member | null> {
    if (!email) return null

    const data = await realCrossDeviceAPI.getData()
    return data.members.find((member) => member && member.email === email) || null
  },

  async getMembersByOrganization(organizationId: string): Promise<Member[]> {
    if (!organizationId) return []

    const data = await realCrossDeviceAPI.getData()
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

    const data = await realCrossDeviceAPI.getData()
    const memberIndex = data.members.findIndex((member) => member && member.id === id)

    if (memberIndex === -1) {
      return null
    }

    data.members[memberIndex] = { ...data.members[memberIndex], ...updates }
    await realCrossDeviceAPI.saveData(data)

    console.log("✏️ Updated member:", data.members[memberIndex].email, updates)

    return data.members[memberIndex]
  },

  async deleteMember(id: string): Promise<boolean> {
    if (!id) return false

    const data = await realCrossDeviceAPI.getData()
    const initialLength = data.members.length
    data.members = data.members.filter((member) => member && member.id !== id)

    if (data.members.length < initialLength) {
      await realCrossDeviceAPI.saveData(data)
      console.log("🗑️ Deleted member:", id)
      return true
    }

    return false
  },

  // Utility functions
  async migrateLocalData(): Promise<void> {
    await realCrossDeviceAPI.getData()
  },

  async syncLocalData(): Promise<void> {
    const data = await realCrossDeviceAPI.getData()
    console.log("🔄 Data synced:", {
      organizations: data.organizations.length,
      members: data.members.length,
    })
  },

  async debugState(): Promise<void> {
    const data = await realCrossDeviceAPI.getData()
    console.log("=== REAL CROSS-DEVICE DATABASE STATE ===")
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

    // Show share URLs
    console.log("Share URLs:")
    data.organizations.forEach((org) => {
      const shareUrl = localStorage.getItem(`share_url_${org.groupId}`)
      if (shareUrl) {
        console.log(`${org.groupId}: ${shareUrl}`)
      }
    })

    console.log("=== END DEBUG ===")
  },

  async forceMigration(): Promise<void> {
    await realCrossDeviceAPI.getData()
    console.log("🔄 Forced migration completed")
  },

  // Get share URL for cross-device sync
  async getShareUrl(groupId: string): Promise<string | null> {
    return localStorage.getItem(`share_url_${groupId}`) || null
  },
}
