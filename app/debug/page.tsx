"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugPage() {
  const [localStorageData, setLocalStorageData] = useState<any>({})

  useEffect(() => {
    // Get all localStorage data
    const data = {
      user: JSON.parse(localStorage.getItem("user") || "null"),
      members: JSON.parse(localStorage.getItem("members") || "[]"),
      organizations: JSON.parse(localStorage.getItem("organizations") || "[]"),
      events: JSON.parse(localStorage.getItem("events") || "[]"),
    }
    setLocalStorageData(data)
  }, [])

  const hashPassword = async (password: string) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest("SHA-256", data)
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  const testPasswordHash = async () => {
    if (localStorageData.user?.password) {
      const hash = await hashPassword(localStorageData.user.password)
      console.log("Password:", localStorageData.user.password)
      console.log("Hash:", hash)
      alert(`Password: ${localStorageData.user.password}\nHash: ${hash}`)
    }
  }

  return (
    <div className="container py-10">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Debug localStorage Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Current User:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(localStorageData.user, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Members ({localStorageData.members?.length || 0}):</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">
              {JSON.stringify(localStorageData.members, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Organizations ({localStorageData.organizations?.length || 0}):</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">
              {JSON.stringify(localStorageData.organizations, null, 2)}
            </pre>
          </div>

          <Button onClick={testPasswordHash}>Test Password Hash</Button>
        </CardContent>
      </Card>
    </div>
  )
}
