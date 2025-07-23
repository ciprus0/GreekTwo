"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Users, Trophy, Target } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useSession } from "next-auth/react"
import { api, type Member, type Hour } from "@/lib/supabase-api"

export default function ServiceHoursDetailsPage() {
  const { data: session } = useSession()
  const [memberHoursSummary, setMemberHoursSummary] = useState<any[]>([])
  const [serviceHoursGoal] = useState(40) // Consider fetching this from org settings
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const organizationId = session?.user?.organization_id

  useEffect(() => {
    if (!organizationId) {
      if (session) {
        setError("Organization ID not found in your session.")
        setLoading(false)
      }
      return
    }

    const fetchServiceDetails = async () => {
      setLoading(true)
      setError(null)
      try {
        const [members, allHours] = await Promise.all([
          api.getMembersByOrganization(organizationId),
          api.getHoursByOrganization(organizationId),
        ])

        const approvedMembers = members.filter((m) => m.approved)

        const summary = approvedMembers.map((member: Member) => {
          const memberServiceHours = allHours.filter(
            (h: Hour) => h.user_id === member.id && h.type === "service" && h.status === "approved",
          )
          const serviceHours = memberServiceHours.reduce((total, h) => total + h.hours, 0)

          return {
            ...member,
            serviceHours,
            serviceEntries: memberServiceHours,
            progress: Math.min(100, (serviceHours / serviceHoursGoal) * 100),
            isComplete: serviceHours >= serviceHoursGoal,
          }
        })

        summary.sort((a, b) => b.serviceHours - a.serviceHours)
        setMemberHoursSummary(summary)
      } catch (err) {
        console.error("Failed to fetch service details:", err)
        setError(err instanceof Error ? err.message : "An unknown error occurred.")
      } finally {
        setLoading(false)
      }
    }

    fetchServiceDetails()
  }, [organizationId, session, serviceHoursGoal])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)]">Loading service details...</div>
  }

  if (error) {
    return <div className="container mx-auto p-4 text-red-500">Error: {error}</div>
  }

  if (!memberHoursSummary.length && !loading) {
    return <div className="container mx-auto p-4">No service hour data available for this organization.</div>
  }

  const totalServiceHours = memberHoursSummary.reduce((total, member) => total + member.serviceHours, 0)
  const averageServiceHours = memberHoursSummary.length > 0 ? totalServiceHours / memberHoursSummary.length : 0
  const completedMembers = memberHoursSummary.filter((m) => m.isComplete).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Hours
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Hours Details</h1>
          <p className="text-muted-foreground">Detailed breakdown of all members' service hour progress.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Service Hours</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServiceHours.toFixed(1)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average per Member</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageServiceHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">out of {serviceHoursGoal} required</p>
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
          <CardTitle>Member Service Hours Breakdown</CardTitle>
          <CardDescription>
            Detailed view of each member's service hour progress and individual entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Service Hours</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Entries</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latest Entry</TableHead>
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
                    <div className="font-medium">{member.serviceHours.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">/ {serviceHoursGoal} required</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Progress value={member.progress} className="h-2" />
                      <div className="text-xs text-muted-foreground">{member.progress.toFixed(0)}%</div>
                    </div>
                  </TableCell>
                  <TableCell>{member.serviceEntries.length} entries</TableCell>
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
                  <TableCell>
                    {member.serviceEntries.length > 0 ? (
                      <div className="text-sm">
                        {formatDate(member.serviceEntries.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No entries</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Service Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Service Activities</CardTitle>
          <CardDescription>Latest service hour entries across all members.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberHoursSummary
                .flatMap((member) =>
                  member.serviceEntries.map((entry) => ({
                    ...entry,
                    memberName: member.name,
                  })),
                )
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 10)
                .map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.date)}</TableCell>
                    <TableCell className="font-medium">{entry.memberName}</TableCell>
                    <TableCell>{entry.hours} hours</TableCell>
                    <TableCell className="max-w-[300px] truncate">{entry.description}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
