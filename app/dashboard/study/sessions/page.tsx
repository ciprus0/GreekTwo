"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, MapPin, Calendar, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/supabase-api"

export default function StudySessionsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [studySessions, setStudySessions] = useState([])
  const [filteredSessions, setFilteredSessions] = useState([])
  const [studyLocations, setStudyLocations] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [locationFilter, setLocationFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  useEffect(() => {
    // Load user data
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      const fetchData = async () => {
        if (!parsedUser || !parsedUser.organization_id) {
          setLoading(false)
          return
        }
        try {
          // Fetch all user's study sessions (active and completed)
          const userSessions = await api.getStudySessionsByUser(parsedUser.id, parsedUser.organization_id)
          setStudySessions(userSessions || [])
          setFilteredSessions(userSessions || []) // Initial filter state

          const orgLocations = await api.getStudyLocationsByOrganization(parsedUser.organization_id)
          setStudyLocations(orgLocations || [])
        } catch (error) {
          console.error("Failed to fetch session data:", error)
          // Consider adding a toast message for the user
        } finally {
          setLoading(false)
        }
      }
      fetchData()

      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Apply filters
    let filtered = studySessions

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((session) => session.locationName.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    // Location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter((session) => session.locationId === locationFilter)
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date()
      const filterDate = new Date()

      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0)
          filtered = filtered.filter((session) => new Date(session.startTime) >= filterDate)
          break
        case "week":
          filterDate.setDate(now.getDate() - 7)
          filtered = filtered.filter((session) => new Date(session.startTime) >= filterDate)
          break
        case "month":
          filterDate.setMonth(now.getMonth() - 1)
          filtered = filtered.filter((session) => new Date(session.startTime) >= filterDate)
          break
      }
    }

    setFilteredSessions(filtered.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)))
  }, [studySessions, searchTerm, locationFilter, dateFilter])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours === 0) {
      return `${minutes} min`
    } else if (minutes === 0) {
      return `${hours} hr`
    } else {
      return `${hours} hr ${minutes} min`
    }
  }

  const getTotalStudyTime = () => {
    return filteredSessions.reduce((total, session) => total + session.duration, 0)
  }

  const getAverageSessionTime = () => {
    if (filteredSessions.length === 0) return 0
    return getTotalStudyTime() / filteredSessions.length
  }

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)]">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Sessions</h1>
          <p className="text-muted-foreground">View and analyze your study session history.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSessions.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredSessions.length === 1 ? "session" : "sessions"} recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(getTotalStudyTime())}</div>
            <p className="text-xs text-muted-foreground">{(getTotalStudyTime() / 3600).toFixed(1)} hours total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Session</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(getAverageSessionTime())}</div>
            <p className="text-xs text-muted-foreground">per study session</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="search">Search Location</Label>
              <Input
                id="search"
                placeholder="Search by location name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location-filter">Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {studyLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date-filter">Time Period</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Study Sessions</CardTitle>
          <CardDescription>
            {filteredSessions.length === studySessions.length
              ? `All ${studySessions.length} study sessions`
              : `${filteredSessions.length} of ${studySessions.length} study sessions`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    {studySessions.length === 0
                      ? "No study sessions recorded yet."
                      : "No sessions match your current filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.locationName}</TableCell>
                    <TableCell>{formatDate(session.startTime)}</TableCell>
                    <TableCell>{formatTime(session.startTime)}</TableCell>
                    <TableCell>{session.endTime ? formatTime(session.endTime) : "In Progress"}</TableCell>
                    <TableCell>{formatDuration(session.duration)}</TableCell>
                    <TableCell>
                      <Badge variant={session.endTime ? "default" : "secondary"}>
                        {session.endTime ? "Completed" : "In Progress"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
