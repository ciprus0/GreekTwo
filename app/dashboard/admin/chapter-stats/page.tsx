"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/supabase-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

// Disable static pre-rendering; render on each request so ThemeProvider is available
export const dynamic = "force-dynamic"

interface ProcessedMemberStats {
  memberId: string
  memberName: string
  totalHours: number
  sessionCount: number
}

interface ChapterStatsData {
  totalStudyHours: number
  totalSessions: number
  averageSessionDurationMinutes: number
  memberStats: ProcessedMemberStats[]
}

export default function ChapterStatsPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<ChapterStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const organizationId = session?.user?.organization_id

  useEffect(() => {
    if (!organizationId) {
      if (session) {
        // Session loaded but no orgId
        setError("Organization ID not found in your session. Cannot fetch chapter stats.")
        setIsLoading(false)
      }
      // If session is still loading, useEffect will re-run when it's available
      return
    }

    const fetchAndProcessStats = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [studySessions, members] = await Promise.all([
          api.getStudySessionsByOrganization(organizationId),
          api.getMembersByOrganization(organizationId),
        ])

        if (!studySessions) {
          throw new Error("Failed to fetch study sessions.")
        }
        if (!members) {
          throw new Error("Failed to fetch members.")
        }

        let totalStudyHours = 0
        const memberSessionData: Record<string, { totalHours: number; sessionCount: number }> = {}

        members.forEach((member) => {
          memberSessionData[member.id] = { totalHours: 0, sessionCount: 0 }
        })

        studySessions.forEach((s) => {
          // s.duration is in seconds, convert to hours
          const durationHours = (s.duration || 0) / 3600
          totalStudyHours += durationHours

          if (memberSessionData[s.user_id]) {
            memberSessionData[s.user_id].totalHours += durationHours
            memberSessionData[s.user_id].sessionCount += 1
          } else {
            // This case should ideally not happen if all users are members
            // but handle it defensively.
            console.warn(`Session found for user ID ${s.user_id} not in member list.`)
          }
        })

        const processedMemberStats: ProcessedMemberStats[] = members
          .map((member) => ({
            memberId: member.id,
            memberName: member.name || "Unknown User",
            totalHours: memberSessionData[member.id]?.totalHours || 0,
            sessionCount: memberSessionData[member.id]?.sessionCount || 0,
          }))
          .sort((a, b) => b.totalHours - a.totalHours)

        const totalSessions = studySessions.length
        const totalDurationSeconds = studySessions.reduce((acc, s) => acc + (s.duration || 0), 0)
        const averageSessionDurationMinutes = totalSessions > 0 ? totalDurationSeconds / totalSessions / 60 : 0

        setStats({
          totalStudyHours,
          totalSessions,
          averageSessionDurationMinutes,
          memberStats: processedMemberStats,
        })
      } catch (err) {
        console.error("Failed to fetch or process chapter stats:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred while loading stats.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAndProcessStats()
  }, [organizationId, session]) // Re-fetch if organizationId or session changes

  if (isLoading) {
    return <ChapterStatsLoadingSkeleton />
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-600">Error: {error}</div>
  }

  if (!stats) {
    return <div className="container mx-auto p-4">No statistics available.</div>
  }
  if (!organizationId && !isLoading) {
    return (
      <div className="container mx-auto p-4">User organization information not available. Cannot display stats.</div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Chapter Study Statistics</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Study Hours</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudyHours.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total accumulated study hours by all members.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Study Sessions</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">Total number of study sessions logged.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageSessionDurationMinutes.toFixed(1)} min</div>
            <p className="text-xs text-muted-foreground">Average length of a single study session.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.memberStats.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Rank</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.memberStats.map((ms, index) => (
                  <TableRow key={ms.memberId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{ms.memberName}</TableCell>
                    <TableCell className="text-right">{ms.totalHours.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{ms.sessionCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No member session data available to display.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ChapterStatsLoadingSkeleton() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <Skeleton className="h-8 w-1/2" />

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-1/4 mb-1" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-5 w-1/6" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/6" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
