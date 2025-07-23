"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/supabase-api"

export default function MigrationPage() {
  const [status, setStatus] = useState("idle") // idle, running, completed, error
  const [progress, setProgress] = useState(0)
  const [log, setLog] = useState<string[]>([])
  const [stats, setStats] = useState({
    organizations: 0,
    members: 0,
    events: 0,
    errors: 0,
  })

  const addLog = (message: string) => {
    setLog((prev) => [...prev, message])
    console.log(message)
  }

  const hashPassword = async (input: string): Promise<string> => {
    // Simple hash for migration - matches the one in supabase-api.ts
    const encoder = new TextEncoder()
    const data = encoder.encode(input || "defaultpassword123")
    const hash = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  const migrateData = async () => {
    try {
      setStatus("running")
      setProgress(0)
      setLog([])
      setStats({
        organizations: 0,
        members: 0,
        events: 0,
        errors: 0,
      })

      addLog("🚀 Starting migration from localStorage to Supabase...")

      // Get data from localStorage
      const organizations = JSON.parse(localStorage.getItem("organizations") || "[]")
      const members = JSON.parse(localStorage.getItem("members") || "[]")
      const events = JSON.parse(localStorage.getItem("events") || "[]")

      addLog(`📊 Found ${organizations.length} organizations, ${members.length} members, and ${events.length} events`)

      // Step 1: Migrate Organizations
      addLog("🏢 Migrating organizations...")
      const orgMap = new Map() // Map old IDs to new UUIDs

      for (let i = 0; i < organizations.length; i++) {
        const org = organizations[i]
        setProgress(Math.floor((i / organizations.length) * 30)) // 0-30% progress

        try {
          // Check if organization already exists by group ID
          const existingOrg = await api.getOrganizationByGroupId(org.groupId)

          if (existingOrg) {
            addLog(`⚠️ Organization ${org.name} (${org.groupId}) already exists, skipping...`)
            orgMap.set(org.id, existingOrg.id)
            continue
          }

          // Create organization in Supabase
          const newOrg = await api.createOrganization({
            groupId: org.groupId,
            name: org.name,
            type: org.type,
            university: org.university,
            chapterDesignation: org.chapter,
            isColony: org.isColony || false,
            foundedYear: org.foundedYear || new Date().getFullYear().toString(),
            roles: org.roles || [
              { id: "admin", name: "Chapter President", isDefault: true, color: "#9333ea", isAdmin: true },
              { id: "treasurer", name: "Treasurer", isDefault: true, color: "#059669", isAdmin: false },
              { id: "member", name: "Member", isDefault: true, color: "#64748b", isAdmin: false },
            ],
          })

          addLog(`✅ Migrated organization: ${org.name} (${org.groupId})`)
          orgMap.set(org.id, newOrg.id) // Map old ID to new UUID
          setStats((prev) => ({ ...prev, organizations: prev.organizations + 1 }))
        } catch (error) {
          addLog(`❌ Error migrating organization ${org.name}: ${error.message}`)
          setStats((prev) => ({ ...prev, errors: prev.errors + 1 }))
        }
      }

      // Step 2: Migrate Members
      addLog("👥 Migrating members...")
      const memberMap = new Map() // Map old IDs to new UUIDs

      for (let i = 0; i < members.length; i++) {
        const member = members[i]
        setProgress(30 + Math.floor((i / members.length) * 50)) // 30-80% progress

        try {
          // Skip if no email (required field)
          if (!member.email) {
            addLog(`⚠️ Member has no email, skipping...`)
            continue
          }

          // Check if member already exists
          const existingMember = await api.getMemberByEmail(member.email)
          if (existingMember) {
            addLog(`⚠️ Member ${member.name} (${member.email}) already exists, updating password...`)

            // Update existing member with password if they don't have one
            if (!existingMember.password_hash && member.password) {
              await api.updateMember(existingMember.id, { password: member.password })
              addLog(`✅ Updated password for existing member: ${member.name}`)
            }

            memberMap.set(member.id, existingMember.id)
            continue
          }

          // Get organization ID from map
          const organizationId = orgMap.get(member.organizationId)
          if (!organizationId) {
            addLog(`⚠️ Cannot find organization for member ${member.name}, skipping...`)
            continue
          }

          // Use existing password from localStorage, or email as fallback
          const passwordToUse = member.password || member.email
          addLog(`🔐 Migrating password for ${member.name} (${member.email})`)

          // Create member in Supabase with their existing password
          const newMember = await api.createMember({
            name: member.name,
            email: member.email,
            password: passwordToUse, // Will be hashed in the API
            organizationId,
            chapter: member.chapter || "",
            university: member.university || "",
            organizationType: member.organizationType || "fraternity",
            role: member.role || "member",
            approved: member.approved !== undefined ? member.approved : true,
          })

          addLog(`✅ Migrated member with password: ${member.name} (${member.email})`)
          memberMap.set(member.id, newMember.id) // Map old ID to new UUID
          setStats((prev) => ({ ...prev, members: prev.members + 1 }))
        } catch (error) {
          addLog(`❌ Error migrating member ${member.name}: ${error.message}`)
          setStats((prev) => ({ ...prev, errors: prev.errors + 1 }))
        }
      }

      // Step 2.5: Handle current user's password specifically
      const currentUser = JSON.parse(localStorage.getItem("user") || "null")
      if (currentUser && currentUser.password) {
        addLog("🔐 Migrating current user's password...")

        try {
          const existingMember = await api.getMemberByEmail(currentUser.email)
          if (existingMember && !existingMember.password_hash) {
            await api.updateMember(existingMember.id, { password: currentUser.password })
            addLog(`✅ Updated current user's password: ${currentUser.email}`)
          }
        } catch (error) {
          addLog(`❌ Error updating current user's password: ${error.message}`)
        }
      }

      // Step 3: Update current user if logged in
      const currentUser2 = JSON.parse(localStorage.getItem("user") || "null")
      if (currentUser2) {
        addLog("🔄 Updating current user session...")

        try {
          // Get the new organization ID
          const newOrgId = orgMap.get(currentUser2.organizationId)

          // Get the member by email
          const member = await api.getMemberByEmail(currentUser2.email)

          if (member) {
            // Get organization details
            const organization = await api.getOrganizationById(member.organization_id)

            // Update user in localStorage with new IDs
            localStorage.setItem(
              "user",
              JSON.stringify({
                ...currentUser2,
                id: member.id,
                organizationId: member.organization_id,
                organizationDetails: organization,
              }),
            )

            addLog("✅ Updated current user session with new IDs")
          } else {
            addLog("⚠️ Could not find current user in Supabase")
          }
        } catch (error) {
          addLog(`❌ Error updating current user: ${error.message}`)
        }
      }

      setProgress(100)
      setStatus("completed")
      addLog("🎉 Migration completed!")
    } catch (error) {
      console.error("Migration error:", error)
      setStatus("error")
      addLog(`❌ Migration failed: ${error.message}`)
    }
  }

  return (
    <div className="container py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Data Migration</CardTitle>
          <CardDescription>
            Migrate your data from localStorage to Supabase database for cross-device synchronization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Migration Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="border rounded-md p-4 h-64 overflow-y-auto bg-slate-50 font-mono text-sm">
            {log.length === 0 ? (
              <p className="text-slate-500">Migration logs will appear here...</p>
            ) : (
              log.map((message, index) => (
                <div key={index} className="py-1">
                  {message}
                </div>
              ))
            )}
          </div>

          {status === "completed" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-green-50 p-4 rounded-md">
                <div className="text-2xl font-bold text-green-600">{stats.organizations}</div>
                <div className="text-sm text-green-800">Organizations</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-md">
                <div className="text-2xl font-bold text-blue-600">{stats.members}</div>
                <div className="text-sm text-blue-800">Members</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-md">
                <div className="text-2xl font-bold text-purple-600">{stats.events}</div>
                <div className="text-sm text-purple-800">Events</div>
              </div>
              <div className="bg-red-50 p-4 rounded-md">
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <div className="text-sm text-red-800">Errors</div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={migrateData} disabled={status === "running"} className="w-full">
            {status === "running"
              ? "Migration in Progress..."
              : status === "completed"
                ? "Run Migration Again"
                : "Start Migration"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
