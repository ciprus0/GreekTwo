// Simulated backend API for cross-device data persistence
// In production, this would be replaced with actual API calls

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

// Simulated global database (in production, this would be a real database)
const GLOBAL_DB_KEY = "greeky_global_database"

interface GlobalDatabase {
  organizations: Organization[]
  members: Member[]
  lastSync: string
  migrated: boolean
}

// Initialize global database
function initGlobalDatabase(): GlobalDatabase {
  const stored = localStorage.getItem(GLOBAL_DB_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // Ensure migrated flag exists
      if (!parsed.hasOwnProperty("migrated")) {
        parsed.migrated = false
      }
      return parsed
    } catch (e) {
      console.warn("Failed to parse global database, initializing new one")
    }
  }

  return {
    organizations: [],
    members: [],
    lastSync: new Date().toISOString(),
    migrated: false,
  }
}

// Save to global database
function saveGlobalDatabase(db: GlobalDatabase) {
  db.lastSync = new Date().toISOString()
  localStorage.setItem(GLOBAL_DB_KEY, JSON.stringify(db))

  // Also broadcast to other tabs/windows
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("globalDatabaseUpdated", { detail: db }))
    } catch (e) {
      console.error("Error dispatching global database update event:", e)
    }
  }
}

// Get global database
function getGlobalDatabase(): GlobalDatabase {
  return initGlobalDatabase()
}

// API Functions
export const api = {
  // Organizations
  async createOrganization(org: Omit<Organization, "id" | "createdAt">): Promise<Organization> {
    const db = getGlobalDatabase()

    const newOrg: Organization = {
      ...org,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    }

    if (!db.organizations) db.organizations = []
    db.organizations.push(newOrg)
    saveGlobalDatabase(db)

    // Sync to local storage for backward compatibility
    await this.syncLocalData()

    return newOrg
  },

  async getOrganizationByGroupId(groupId: string): Promise<Organization | null> {
    // Safety check for undefined or null groupId
    if (!groupId) {
      console.error("getOrganizationByGroupId called with null or undefined groupId")
      return null
    }

    // Ensure migration has run
    await this.migrateLocalData()

    const db = getGlobalDatabase()

    // Safety check for organizations array
    if (!db.organizations || !Array.isArray(db.organizations)) {
      console.error("Organizations array is not properly initialized")
      return null
    }

    // Manually check each organization instead of using find with toUpperCase
    let foundOrg = null
    for (const org of db.organizations) {
      // Safety check for org and org.groupId
      if (org && org.groupId && typeof org.groupId === "string") {
        if (org.groupId.toUpperCase() === groupId.toUpperCase()) {
          foundOrg = org
          break
        }
      }
    }

    console.log("Looking for Group ID:", groupId)
    console.log(
      "Available organizations:",
      db.organizations.map((o) => ({ groupId: o?.groupId || "unknown", name: o?.name || "unknown" })),
    )
    console.log("Found organization:", foundOrg)

    return foundOrg
  },

  async getOrganizationById(id: string): Promise<Organization | null> {
    if (!id) return null

    const db = getGlobalDatabase()
    if (!db.organizations || !Array.isArray(db.organizations)) return null

    return db.organizations.find((org) => org && org.id === id) || null
  },

  async getAllOrganizations(): Promise<Organization[]> {
    const db = getGlobalDatabase()
    return db.organizations || []
  },

  // Members
  async createMember(member: Omit<Member, "id" | "joinDate">): Promise<Member> {
    const db = getGlobalDatabase()

    // Check if email already exists globally
    if (db.members && Array.isArray(db.members)) {
      const existingMember = db.members.find((m) => m && m.email === member.email)
      if (existingMember) {
        throw new Error("Email already registered")
      }
    }

    const newMember: Member = {
      ...member,
      id: Date.now().toString(),
      joinDate: new Date().toISOString(),
    }

    if (!db.members) db.members = []
    db.members.push(newMember)
    saveGlobalDatabase(db)

    // Sync to local storage for backward compatibility
    await this.syncLocalData()

    return newMember
  },

  async getMemberByEmail(email: string): Promise<Member | null> {
    if (!email) return null

    const db = getGlobalDatabase()
    if (!db.members || !Array.isArray(db.members)) return null

    return db.members.find((member) => member && member.email === email) || null
  },

  async getMembersByOrganization(organizationId: string): Promise<Member[]> {
    if (!organizationId) return []

    const db = getGlobalDatabase()
    if (!db.members || !Array.isArray(db.members)) return []

    return db.members.filter((member) => member && member.organizationId === organizationId) || []
  },

  async updateMember(id: string, updates: Partial<Member>): Promise<Member | null> {
    if (!id) return null

    const db = getGlobalDatabase()
    if (!db.members || !Array.isArray(db.members)) return null

    const memberIndex = db.members.findIndex((member) => member && member.id === id)

    if (memberIndex === -1) {
      return null
    }

    db.members[memberIndex] = { ...db.members[memberIndex], ...updates }
    saveGlobalDatabase(db)

    // Sync to local storage for backward compatibility
    await this.syncLocalData()

    return db.members[memberIndex]
  },

  // Sync local data with global database
  async syncLocalData(): Promise<void> {
    const db = getGlobalDatabase()

    // Update local storage with global data for backward compatibility
    localStorage.setItem("organizations", JSON.stringify(db.organizations || []))
    localStorage.setItem("members", JSON.stringify(db.members || []))
  },

  // Migration function to move existing local data to global database
  async migrateLocalData(): Promise<void> {
    const db = getGlobalDatabase()

    // Skip if already migrated
    if (db.migrated) {
      return
    }

    console.log("Starting migration of local data...")

    let migrationOccurred = false

    // Migrate organizations
    try {
      const localOrgs = localStorage.getItem("organizations")
      if (localOrgs) {
        try {
          const orgs = JSON.parse(localOrgs)
          if (Array.isArray(orgs)) {
            console.log(
              "Found local organizations:",
              orgs.map((o) => ({ groupId: o?.groupId || "unknown", name: o?.name || "unknown" })),
            )

            // Ensure organizations array exists
            if (!db.organizations) db.organizations = []

            orgs.forEach((org) => {
              // Only add if valid and not already in global database
              if (org && org.groupId && typeof org.groupId === "string") {
                const exists = db.organizations.some((existing) => existing && existing.groupId === org.groupId)
                if (!exists) {
                  console.log("Migrating organization:", org.groupId, org.name)
                  db.organizations.push(org)
                  migrationOccurred = true
                }
              }
            })
          }
        } catch (e) {
          console.warn("Failed to parse local organizations:", e)
        }
      }
    } catch (e) {
      console.error("Error during organization migration:", e)
    }

    // Migrate members
    try {
      const localMembers = localStorage.getItem("members")
      if (localMembers) {
        try {
          const members = JSON.parse(localMembers)
          if (Array.isArray(members)) {
            console.log("Found local members:", members.length)

            // Ensure members array exists
            if (!db.members) db.members = []

            members.forEach((member) => {
              // Only add if valid and not already in global database
              if (member && member.email && typeof member.email === "string") {
                const exists = db.members.some((existing) => existing && existing.email === member.email)
                if (!exists) {
                  console.log("Migrating member:", member.email)
                  db.members.push(member)
                  migrationOccurred = true
                }
              }
            })
          }
        } catch (e) {
          console.warn("Failed to parse local members:", e)
        }
      }
    } catch (e) {
      console.error("Error during member migration:", e)
    }

    // Mark as migrated
    db.migrated = true

    if (migrationOccurred) {
      console.log("Migration completed. Global database now contains:")
      console.log(
        "Organizations:",
        (db.organizations || []).map((o) => ({ groupId: o?.groupId || "unknown", name: o?.name || "unknown" })),
      )
      console.log("Members:", (db.members || []).length)
    }

    saveGlobalDatabase(db)
    await this.syncLocalData()
  },

  // Force re-migration (for debugging)
  async forceMigration(): Promise<void> {
    try {
      const db = getGlobalDatabase()
      db.migrated = false
      saveGlobalDatabase(db)
      await this.migrateLocalData()
    } catch (e) {
      console.error("Error during force migration:", e)
    }
  },

  // Debug function to check current state
  async debugState(): Promise<void> {
    try {
      const db = getGlobalDatabase()
      console.log("=== GLOBAL DATABASE STATE ===")
      console.log("Migrated:", db.migrated)
      console.log(
        "Organizations:",
        (db.organizations || []).map((o) => ({
          groupId: o?.groupId || "unknown",
          name: o?.name || "unknown",
          id: o?.id || "unknown",
        })),
      )
      console.log(
        "Members:",
        (db.members || []).map((m) => ({
          email: m?.email || "unknown",
          name: m?.name || "unknown",
          organizationId: m?.organizationId || "unknown",
          approved: m?.approved,
        })),
      )

      console.log("=== LOCAL STORAGE STATE ===")
      const localOrgs = localStorage.getItem("organizations")
      const localMembers = localStorage.getItem("members")

      if (localOrgs) {
        try {
          const orgs = JSON.parse(localOrgs)
          console.log(
            "Local Organizations:",
            Array.isArray(orgs)
              ? orgs.map((o) => ({ groupId: o?.groupId || "unknown", name: o?.name || "unknown" }))
              : "Invalid format",
          )
        } catch (e) {
          console.log("Local Organizations: Invalid JSON")
        }
      } else {
        console.log("Local Organizations: None")
      }

      if (localMembers) {
        try {
          const members = JSON.parse(localMembers)
          console.log("Local Members:", Array.isArray(members) ? members.length : "Invalid format")
        } catch (e) {
          console.log("Local Members: Invalid JSON")
        }
      } else {
        console.log("Local Members: None")
      }
    } catch (e) {
      console.error("Error during debug state:", e)
    }
  },
}

// Listen for global database updates from other tabs
if (typeof window !== "undefined") {
  window.addEventListener("globalDatabaseUpdated", (event: any) => {
    try {
      const db = event.detail as GlobalDatabase
      // Update local storage for backward compatibility
      localStorage.setItem("organizations", JSON.stringify(db.organizations || []))
      localStorage.setItem("members", JSON.stringify(db.members || []))
    } catch (e) {
      console.error("Error handling global database update:", e)
    }
  })
}
