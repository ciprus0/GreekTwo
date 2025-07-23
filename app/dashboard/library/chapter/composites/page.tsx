"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Users, User } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"

interface UserData {
  id: string
  organizationId: string
  role?: string
}

export default function CompositesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [fullCompositeCount, setFullCompositeCount] = useState(0)
  const [individualCount, setIndividualCount] = useState(0)

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setUserData({
          id: user.id,
          organizationId: user.organizationId || user.organization_id,
          role: user.role,
        })
      } catch (error) {
        console.error("Error parsing user data:", error)
        setError("Failed to load user data")
      }
    } else {
      setError("User not found. Please log in.")
    }
  }, [])

  // Fetch composite counts
  useEffect(() => {
    const fetchCompositeCounts = async () => {
      if (!userData?.organizationId) return

      setLoading(true)
      setError(null)

      try {
        // Query for full composites
        const { data: fullData, error: fullError } = await supabase
          .from("library_files_new")
          .select("id")
          .eq("organization_id", userData.organizationId)
          .eq("document_type", "Composites")
          .eq("composite_type", "Full Composite")

        if (fullError) {
          console.error("Error fetching full composites:", fullError)
          setError(`Failed to fetch composites: ${fullError.message}`)
          return
        }

        // Query for individual pictures
        const { data: individualData, error: individualError } = await supabase
          .from("library_files_new")
          .select("id")
          .eq("organization_id", userData.organizationId)
          .eq("document_type", "Composites")
          .eq("composite_type", "Individual")

        if (individualError) {
          console.error("Error fetching individual pictures:", individualError)
          setError(`Failed to fetch composites: ${individualError.message}`)
          return
        }

        setFullCompositeCount(fullData?.length || 0)
        setIndividualCount(individualData?.length || 0)
      } catch (err: any) {
        console.error("Error fetching composites:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (userData) {
      fetchCompositeCounts()
    }
  }, [userData])

  const handleUploadSuccess = () => {
    // Refresh the counts
    if (userData) {
      const fetchCounts = async () => {
        try {
          const { data: fullData } = await supabase
            .from("library_files_new")
            .select("id")
            .eq("organization_id", userData.organizationId)
            .eq("document_type", "Composites")
            .eq("composite_type", "Full Composite")

          const { data: individualData } = await supabase
            .from("library_files_new")
            .select("id")
            .eq("organization_id", userData.organizationId)
            .eq("document_type", "Composites")
            .eq("composite_type", "Individual")

          setFullCompositeCount(fullData?.length || 0)
          setIndividualCount(individualData?.length || 0)
        } catch (err) {
          console.error("Error refreshing counts:", err)
        }
      }
      fetchCounts()
    }
    setIsUploadDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.push("/dashboard/library/chapter")} className="mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Composites</h1>
        </div>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading composites...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => router.push("/dashboard/library/chapter")} className="mr-2">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Composites</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => router.push("/dashboard/library/chapter")} className="mr-2">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Chapter Files
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Composites</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <Link href="/dashboard/library/chapter/composites/full">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Full Composites</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">Complete chapter composite photos organized by year</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/library/chapter/composites/individual">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Individual Pictures</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">Individual member photos from composite sessions</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
