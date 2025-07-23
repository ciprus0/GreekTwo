"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, RefreshCw, CheckCircle, AlertCircle, Info } from "lucide-react"
import { api } from "@/lib/supabase-api"

export function MigrationStatus() {
  const [migrationStatus, setMigrationStatus] = useState("checking")
  const [migrationDetails, setMigrationDetails] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const checkMigrationStatus = async () => {
    try {
      // First check database connectivity
      const dbConnected = await api.ensureTablesExist()

      if (!dbConnected) {
        setMigrationStatus("error")
        setMigrationDetails({
          hasLocalData: false,
          localDataCount: 0,
          hasSupabaseData: false,
          supabaseOrgCount: 0,
          dbError: "Database tables not accessible",
        })
        return
      }

      // Check if there's any localStorage data that needs migration
      const localKeys = ["organizations", "members", "greeky_global_database", "greeky_cross_device_database"]
      let hasLocalData = false
      let localDataCount = 0

      for (const key of localKeys) {
        const data = localStorage.getItem(key)
        if (data) {
          try {
            const parsed = JSON.parse(data)
            if (Array.isArray(parsed) && parsed.length > 0) {
              hasLocalData = true
              localDataCount += parsed.length
            } else if (parsed && typeof parsed === "object") {
              if (parsed.organizations?.length > 0 || parsed.members?.length > 0) {
                hasLocalData = true
                localDataCount += (parsed.organizations?.length || 0) + (parsed.members?.length || 0)
              }
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }

      // Check if there's data in Supabase
      const supabaseOrgs = await api.getAllOrganizations()
      const hasSupabaseData = supabaseOrgs.length > 0

      setMigrationDetails({
        hasLocalData,
        localDataCount,
        hasSupabaseData,
        supabaseOrgCount: supabaseOrgs.length,
        dbConnected: true,
      })

      if (hasLocalData && !hasSupabaseData) {
        setMigrationStatus("needed")
      } else if (hasLocalData && hasSupabaseData) {
        setMigrationStatus("partial")
      } else if (!hasLocalData && hasSupabaseData) {
        setMigrationStatus("complete")
      } else {
        setMigrationStatus("none")
      }
    } catch (error) {
      console.error("Error checking migration status:", error)
      setMigrationStatus("error")
      setMigrationDetails({
        hasLocalData: false,
        localDataCount: 0,
        hasSupabaseData: false,
        supabaseOrgCount: 0,
        dbError: error.message,
      })
    }
  }

  const runMigration = async () => {
    setIsRunning(true)
    try {
      await api.migrateLocalData()
      await checkMigrationStatus()
    } catch (error) {
      console.error("Migration failed:", error)
      setMigrationStatus("error")
    } finally {
      setIsRunning(false)
    }
  }

  useEffect(() => {
    checkMigrationStatus()
  }, [])

  const getStatusIcon = () => {
    switch (migrationStatus) {
      case "complete":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "needed":
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getStatusBadge = () => {
    switch (migrationStatus) {
      case "complete":
        return <Badge className="bg-green-100 text-green-800">Migration Complete</Badge>
      case "needed":
        return <Badge className="bg-yellow-100 text-yellow-800">Migration Needed</Badge>
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-800">Partial Migration</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">Migration Error</Badge>
      case "checking":
        return <Badge className="bg-blue-100 text-blue-800">Checking...</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">No Data</Badge>
    }
  }

  if (migrationStatus === "complete" || migrationStatus === "none") {
    return null // Don't show if migration is complete or not needed
  }

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle className="text-lg">Data Migration Status</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Migrating your data from local storage to Supabase database for cross-device sync.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm">
              {migrationStatus === "needed" && "Local data found that needs to be migrated to database"}
              {migrationStatus === "partial" && "Some data may still need migration"}
              {migrationStatus === "error" && "Migration encountered errors - check console for details"}
              {migrationStatus === "checking" && "Checking migration status..."}
            </span>
          </div>

          {migrationDetails?.dbError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">Database Error: {migrationDetails.dbError}</div>
          )}

          {migrationDetails && !migrationDetails.dbError && (
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Database Connected
              </div>
              <div>Local data items: {migrationDetails.localDataCount}</div>
              <div>Supabase organizations: {migrationDetails.supabaseOrgCount}</div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={runMigration} disabled={isRunning} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Migrating..." : "Run Migration"}
            </Button>
            <Button onClick={checkMigrationStatus} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Check Status
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
