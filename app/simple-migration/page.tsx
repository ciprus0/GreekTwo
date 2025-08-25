"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/supabase-api"

export default function SimpleMigrationPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [defaultPassword, setDefaultPassword] = useState("password123")
  const [migrationComplete, setMigrationComplete] = useState(false)

  const addLog = (message: string) => {
    console.log(message)
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const startMigration = async () => {
    setIsLoading(true)
    setLogs([])
    addLog("🚀 Starting simple migration...")

    try {
      // Check localStorage data
      const localUser = JSON.parse(localStorage.getItem("user") || "{}")
      const localMembers = JSON.parse(localStorage.getItem("members") || "[]")
      const localOrganizations = JSON.parse(localStorage.getItem("organizations") || "[]")

      addLog(`📊 Found ${localMembers.length} members in localStorage`)
      addLog(`📊 Found ${localOrganizations.length} organizations in localStorage`)
      addLog(`👤 Current user: ${localUser.email || "Not found"}`)

      if (!localUser.email) {
        addLog("❌ No current user found in localStorage")
        return
      }

      // 1. Migrate organizations first
      let targetOrgId = null
      for (const org of localOrganizations) {
        addLog(`🏢 Migrating organization: ${org.name}`)

        try {
          const existingOrg = await api.getOrganizationByGroupId(org.groupId)
          if (existingOrg) {
            addLog(`✅ Organization ${org.name} already exists in Supabase`)
            targetOrgId = existingOrg.id
          } else {
            const newOrg = await api.createOrganization({
              groupId: org.groupId,
              name: org.name,
              type: org.type,
              university: org.university,
              chapterDesignation: org.chapterDesignation,
              isColony: org.isColony,
              foundedYear: org.foundedYear,
              roles: org.roles || [],
            })
            addLog(`✅ Created organization: ${newOrg.name}`)
            targetOrgId = newOrg.id
          }
        } catch (error) {
          addLog(`❌ Error with organization ${org.name}: ${error.message}`)
        }
      }

      if (!targetOrgId) {
        addLog("❌ No organization available for migration")
        return
      }

      // 2. Migrate current user specifically
      addLog(`👤 Migrating current user: ${localUser.email}`)

      try {
        const existingMember = await api.getMemberByEmail(localUser.email)

        if (existingMember) {
          // Update existing member with password
          addLog(`🔄 Updating existing member with password...`)
          await api.updateMember(existingMember.id, {
            password: defaultPassword,
          })
          addLog(`✅ Updated member ${localUser.email} with password`)
        } else {
          // Create new member
          addLog(`➕ Creating new member...`)
          await api.createMember({
            name: localUser.name,
            email: localUser.email,
            password: defaultPassword,
            organizationId: targetOrgId,
            chapter: localUser.chapter || "Unknown",
            university: localUser.university || "Unknown",
            organizationType: localUser.organizationType || "fraternity",
            role: localUser.role || "member",
            approved: true, // Auto-approve current user
          })
          addLog(`✅ Created member ${localUser.email} with password`)
        }
      } catch (error) {
        addLog(`❌ Error migrating current user: ${error.message}`)
      }

      // 3. Migrate other members
      for (const member of localMembers) {
        if (member.email === localUser.email) continue // Skip current user, already done

        addLog(`👤 Migrating member: ${member.email}`)

        try {
          const existingMember = await api.getMemberByEmail(member.email)

          if (existingMember) {
            addLog(`⏭️ Member ${member.email} already exists, skipping`)
          } else {
            await api.createMember({
              name: member.name,
              email: member.email,
              password: member.password || defaultPassword, // Use existing password or default
              organizationId: targetOrgId,
              chapter: member.chapter,
              university: member.university,
              organizationType: member.organizationType,
              role: member.role,
              approved: member.approved,
            })
            addLog(`✅ Created member ${member.email}`)
          }
        } catch (error) {
          addLog(`❌ Error migrating member ${member.email}: ${error.message}`)
        }
      }

      addLog("🎉 Migration completed successfully!")
      addLog(`🔑 You can now login with email: ${localUser.email}`)
      addLog(`🔑 Password: ${defaultPassword}`)
      setMigrationComplete(true)
    } catch (error) {
      addLog(`❌ Migration failed: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl overflow-hidden">
      <Card>
        <CardHeader>
          <CardTitle>Simple Data Migration</CardTitle>
          <CardDescription>Migrate your localStorage data to Supabase with password authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">Default Password (for accounts without passwords)</Label>
            <Input
              id="password"
              type="password"
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
              placeholder="Enter default password"
            />
            <p className="text-sm text-gray-600">
              This password will be used for your account and any accounts that don't have passwords stored.
            </p>
          </div>

          <Button onClick={startMigration} disabled={isLoading || !defaultPassword} className="w-full">
            {isLoading ? "Migrating..." : "Start Migration"}
          </Button>

          {migrationComplete && (
            <div className="p-4 bg-green-100 border border-green-300 rounded-md">
              <h3 className="font-semibold text-green-800">Migration Complete!</h3>
              <p className="text-green-700">
                You can now{" "}
                <a href="/login" className="underline">
                  login
                </a>{" "}
                with your email and the password you set.
              </p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Migration Logs:</h3>
              <div className="bg-gray-100 p-4 rounded-md max-h-96 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
