"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Trophy, Target, BookOpen, MapPin } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSession } from "next-auth/react"
import { api, type Member, type Hour, type StudySession } from "@/lib/supabase-api" // Assuming types are exported from supabase-api

export default function StudyHoursDetailsPage() {
  const { data: session } = useSession()
  const [memberHoursSummary, setMemberHoursSummary] = useState<any[]>([]) // Consider creating a more specific type
  const [studyHoursGoal] = useState(50) // Keep this or fetch from org settings if available
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const organizationId = session?.user?.organization_id
  const currentUserId = session?.user?.id // If needed for user-specific views, though this page is org-wide

  useEffect(() => {
    if (!organizationId) {
      if (session) {
        // Session loaded, but no orgId
        setError("Organization ID not found in your session. Cannot fetch details.")
        setLoading(false)
      }
      // If session is still loading, useEffect will re-run
      return
    }

    const fetchStudyDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const [members, allHours, allStudySessions] = await Promise.all([
          api.getMembersByOrganization(organizationId),
          api.getHoursByOrganization(organizationId), // Fetches all hour entries for the org
          api.getStudySessionsByOrganization(organizationId), // Fetches all study sessions for the org
        ])

        const approvedMembers = members.filter((m) => m.approved)

        const summary = approvedMembers.map((member: Member) => {
          // Filter manual hour entries for this member that are 'study' type and 'approved'
          const memberManualHours = allHours.filter(
            (h: Hour) => h.user_id === member.id && h.type === "study" && h.status === "approved",
          )
          const manualStudyHours = memberManualHours.reduce((total, h) => total + h.hours, 0)

          // Filter study sessions for this member
          const memberStudySessions = allStudySessions.filter(
            (s: StudySession) => s.user_id === member.id && s.status === "completed", // Only count completed sessions
          )
          const sessionStudyHours = memberStudySessions.reduce((total, s) => {
            return total + (s.duration || 0) / 3600 // duration is in seconds
          }, 0)

          const totalStudyHours = manualStudyHours + sessionStudyHours

          // For 'studyEntries', we can list manual entries. Sessions are separate.
          const studyEntries = memberManualHours

          return {
            ...member, // Includes member.id, member.name
            studyHours: totalStudyHours,
            manualStudyHours,
            sessionStudyHours,
            studyEntries, // Manual entries
            studySessions: memberStudySessions, // Location-based sessions
            progress: Math.min(100, (totalStudyHours / studyHoursGoal) * 100),
            isComplete: totalStudyHours >= studyHoursGoal,
          }
        })

        summary.sort((a, b) => b.studyHours - a.studyHours)
        setMemberHoursSummary(summary)
      } catch (err) {
        console.error("Failed to fetch study details:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred.")
      } finally {
        setLoading(false)
      }
    }

    fetchStudyDetails()
  }, [organizationId, session, studyHoursGoal])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    // You can create a more detailed skeleton loader component
    return <div className="flex items-center justify-center h-[calc(100vh-200px)]">Loading study details...</div>
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>
  }

  if (!memberHoursSummary.length && !loading) {
    return <div className="container mx-auto p-4">No study data available for this organization.</div>
  }

  const totalStudyHours = memberHoursSummary.reduce((total, member) => total + member.studyHours, 0)
  const averageStudyHours = memberHoursSummary.length > 0 ? totalStudyHours / memberHoursSummary.length : 0
  const completedMembers = memberHoursSummary.filter((m) => m.isComplete).length
  const totalSessions = memberHoursSummary.reduce((total, member) => total + member.studySessions.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Hours
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Hours Details</h1>
          <p className="text-muted-foreground">Detailed breakdown of all members' study hour progress.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Study Hours</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudyHours.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average per Member</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageStudyHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">out of {studyHoursGoal} required</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Members Completed</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedMembers}</div>
            <p className="text-xs text-muted-foreground">out of {memberHoursSummary.length} members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSessions}</div>
            <p className="text-xs text-muted-foreground">study sessions logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {memberHoursSummary.length > 0 ? ((completedMembers / memberHoursSummary.length) * 100).toFixed(0) : 0}%
            </div>
            <Progress
              value={memberHoursSummary.length > 0 ? (completedMembers / memberHoursSummary.length) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Member Table */}
      <Card>
        <CardHeader>
          <CardTitle>Member Study Hours Breakdown</CardTitle>
          <CardDescription>
            Detailed view of each member's study hour progress including location-based sessions and manual entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Session Hours</TableHead>
                <TableHead>Manual Hours</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberHoursSummary.map((member, index) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {index < 3 && <Trophy className="h-4 w-4 text-yellow-500" />}#{index + 1}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <div className="font-medium">{member.studyHours.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">/ {studyHoursGoal} required</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{member.sessionStudyHours.toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">from locations</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{member.manualStudyHours.toFixed(1)}h</div>
                    <div className="text-xs text-muted-foreground">manual entries</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={member.progress} className="h-2" />
                      <div className="text-xs text-muted-foreground">{member.progress.toFixed(0)}%</div>
                    </div>
                  </TableCell>
                  <TableCell>{member.studySessions.length} sessions</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        member.isComplete
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                      }`}
                    >
                      {member.isComplete ? "Complete" : "In Progress"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Study Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Study Activities</CardTitle>
          <CardDescription>Latest study sessions and manual entries across all members.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Location/Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                // Study sessions
                ...memberHoursSummary.flatMap((member) =>
                  member.studySessions.map((session) => ({
                    ...session,
                    memberName: member.name,
                    type: "Session",
                    date: session.startTime,
                    description: session.locationName || "Study Location",
                  })),
                ),
                // Manual entries
                ...memberHoursSummary.flatMap((member) =>
                  member.studyEntries.map((entry) => ({
                    ...entry,
                    memberName: member.name,
                    type: "Manual",
                    duration: entry.hours * 3600,
                  })),
                ),
              ]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 15)
                .map((activity, index) => (
                  <TableRow key={`${activity.type}-${activity.id || index}`}>
                    <TableCell>{formatDate(activity.date)}</TableCell>
                    <TableCell className="font-medium">{activity.memberName}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          activity.type === "Session"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-purple-100 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {activity.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {activity.type === "Session" ? formatDuration(activity.duration) : `${activity.hours}h`}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{activity.description}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
