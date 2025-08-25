"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { Clock, Filter, Plus, Search, Trash, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeWrapper, useTextColors } from "@/components/theme-wrapper"
import { useTheme } from "@/lib/theme-context"

const CircleCheckbox = ({ checked, onCheckedChange, id, className }) => {
  return (
    <div className="relative">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          "h-5 w-5 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-slate-300",
          className,
        )}
      />
      {checked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const { toast } = useToast()
  const [user, setUser] = useState(null)
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium",
  })

  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getAccentTextColor } = useTextColors()
  const { theme } = useTheme()

  // Get theme-aware card classes
  const getCardClasses = () => {
    switch (theme) {
      case "original":
        return "original-card"
      case "light":
        return "light-glass-card"
      case "dark":
      default:
        return "glass-card border-white/20"
    }
  }

  useEffect(() => {
    // Load user data
    const userData = localStorage.getItem("user")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)

      // Load tasks
      const tasksData = localStorage.getItem("tasks")
      if (tasksData) {
        const allTasks = JSON.parse(tasksData)
        // Filter tasks for current user or organization
        const userTasks = parsedUser.organizationId
          ? allTasks.filter((task) => task.organizationId === parsedUser.organizationId)
          : allTasks.filter((task) => task.assignedTo === parsedUser.id || task.assignedTo === null)

        setTasks(userTasks)
      } else {
        // Initialize with default tasks if none exist
        const defaultTasks = [
          {
            id: "1",
            title: "Submit event proposal",
            description: "Create and submit proposal for the upcoming social event",
            completed: true,
            assignedTo: parsedUser.id,
            assignedToName: parsedUser.name,
            organizationId: parsedUser.organizationId || null,
            createdAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            priority: "high",
          },
          {
            id: "2",
            title: "Update member directory",
            description: "Add new members to the directory and update contact information",
            completed: false,
            assignedTo: parsedUser.id,
            assignedToName: parsedUser.name,
            organizationId: parsedUser.organizationId || null,
            createdAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            priority: "medium",
          },
          {
            id: "3",
            title: "Collect dues from new members",
            description: "Collect and record dues payments from all new members",
            completed: false,
            assignedTo: parsedUser.id,
            assignedToName: parsedUser.name,
            organizationId: parsedUser.organizationId || null,
            createdAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            priority: "high",
          },
          {
            id: "4",
            title: "Prepare for alumni event",
            description: "Coordinate with alumni relations to prepare for the upcoming event",
            completed: false,
            assignedTo: parsedUser.id,
            assignedToName: parsedUser.name,
            organizationId: parsedUser.organizationId || null,
            createdAt: new Date().toISOString(),
            dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
            priority: "low",
          },
        ]
        localStorage.setItem("tasks", JSON.stringify(defaultTasks))
        setTasks(defaultTasks)
      }

      // Load members for task assignment
      const membersData = localStorage.getItem("members")
      if (membersData) {
        const allMembers = JSON.parse(membersData)
        // Filter members by organization if user has an organizationId
        if (parsedUser.organizationId) {
          const orgMembers = allMembers.filter(
            (member) => member.organizationId === parsedUser.organizationId && member.approved,
          )
          setMembers(orgMembers)
        } else {
          setMembers(allMembers.filter((member) => member.approved))
        }
      }

      setLoading(false)
    }
  }, [])

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleStatusFilter = (value) => {
    setStatusFilter(value)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleTaskToggle = (taskId) => {
    // Update tasks state
    const updatedTasks = tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task))

    setTasks(updatedTasks)

    // Update localStorage
    const allTasks = JSON.parse(localStorage.getItem("tasks") || "[]")
    const updatedAllTasks = allTasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task,
    )

    localStorage.setItem("tasks", JSON.stringify(updatedAllTasks))

    toast({
      title: updatedTasks.find((t) => t.id === taskId).completed ? "Task completed" : "Task reopened",
      description: updatedTasks.find((t) => t.id === taskId).title,
    })
  }

  const handleDeleteTask = (taskId) => {
    // Remove task from state
    const updatedTasks = tasks.filter((task) => task.id !== taskId)
    setTasks(updatedTasks)

    // Update localStorage
    const allTasks = JSON.parse(localStorage.getItem("tasks") || "[]")
    const updatedAllTasks = allTasks.filter((task) => task.id !== taskId)
    localStorage.setItem("tasks", JSON.stringify(updatedAllTasks))

    toast({
      title: "Task deleted",
      description: "The task has been deleted successfully.",
    })
  }

  const handleCreateTask = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Task title is required.",
        variant: "destructive",
      })
      return
    }

    const assignedMember = members.find((member) => member.id === formData.assignedTo)

    // Create new task
    const newTask = {
      id: Date.now().toString(),
      title: formData.title,
      description: formData.description || "",
      completed: false,
      assignedTo: formData.assignedTo || user.id,
      assignedToName: assignedMember ? assignedMember.name : user.name,
      organizationId: user.organizationId || null,
      createdAt: new Date().toISOString(),
      dueDate: formData.dueDate || null,
      priority: formData.priority || "medium",
    }

    // Update state
    const updatedTasks = [newTask, ...tasks]
    setTasks(updatedTasks)

    // Update localStorage
    const allTasks = JSON.parse(localStorage.getItem("tasks") || "[]")
    const updatedAllTasks = [newTask, ...allTasks]
    localStorage.setItem("tasks", JSON.stringify(updatedAllTasks))

    // Reset form and close dialog
    setFormData({
      title: "",
      description: "",
      assignedTo: "",
      dueDate: "",
      priority: "medium",
    })
    setIsDialogOpen(false)

    toast({
      title: "Task created",
      description: "The task has been created successfully.",
    })
  }

  // Filter tasks based on search and status filter
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "completed" && task.completed) ||
      (statusFilter === "pending" && !task.completed)

    return matchesSearch && matchesStatus
  })

  // Sort tasks: pending first, then by priority, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // First sort by completion status
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }

    // Then sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority || "medium"] - priorityOrder[b.priority || "medium"]
    }

    // Then sort by due date if available
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate) - new Date(b.dueDate)
    }

    return 0
  })

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "No due date"

    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Get priority badge color
  const getPriorityBadge = (priority) => {
    if (!priority) return "bg-slate-100 text-slate-800 border-slate-200"

    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
    }
  }

  // Safe function to get initials from name
  const getInitials = (name) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
  }

  const isAdmin = user?.role === "admin" || user?.role === "executive"

  if (loading) {
    return <div className="flex items-center justify-center h-[calc(100vh-200px)]">Loading...</div>
  }

  return (
    <ThemeWrapper>
      <div className="space-y-6 p-4 md:p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${getTextColor()}`}>Tasks</h1>
            <p className={`text-muted-foreground ${getMutedTextColor()}`}>Manage and track tasks for your chapter.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="glass-button">
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>Add a new task for yourself or assign it to a team member.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter task title"
                    className="glass-input"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    className="glass-input min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter task description"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="assignedTo">Assign To</Label>
                  <Select
                    value={formData.assignedTo}
                    onValueChange={(value) => handleSelectChange("assignedTo", value)}
                  >
                    <SelectTrigger id="assignedTo">
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user.id}>Me ({user.name})</SelectItem>
                      {members
                        .filter((member) => member.id !== user.id)
                        .map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="glass-input"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleSelectChange("priority", value)}>
                    <SelectTrigger id="priority">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="glass-button-outline">
                  Cancel
                </Button>
                <Button className="glass-button" onClick={handleCreateTask}>
                  Create Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card className={getCardClasses()}>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <CardTitle className={getTextColor()}>Task List</CardTitle>
                <CardDescription className={getMutedTextColor()}>View and manage all tasks.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="search"
                    placeholder="Search tasks..."
                    className="glass-input pl-8 w-full sm:w-[200px]"
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                </div>
                <Select defaultValue="all" onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <div className="flex items-center">
                      <Filter className="mr-2 h-4 w-4" />
                      <span>Filter by status</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tasks</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList className="glass-tabs">
                <TabsTrigger value="list" className="glass-tab">
                  List View
                </TabsTrigger>
                <TabsTrigger value="table" className="glass-tab">
                  Table View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <div className="space-y-4">
                  {sortedTasks.length === 0 ? (
                    <div className={`text-center py-8 ${getMutedTextColor()}`}>
                      No tasks found. Create a new task or adjust your search filters.
                    </div>
                  ) : (
                    sortedTasks.map((task) => (
                      <div key={task.id} className={`p-4 border rounded-lg ${task.completed ? "bg-slate-50" : ""}`}>
                        <div className="flex items-start gap-3">
                          <CircleCheckbox
                            id={`task-${task.id}`}
                            checked={task.completed}
                            onCheckedChange={() => handleTaskToggle(task.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <label
                                htmlFor={`task-${task.id}`}
                                className={`font-medium ${task.completed ? "line-through text-slate-500" : ""}`}
                              >
                                {task.title}
                              </label>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-xs px-2 py-1 rounded-full border ${getPriorityBadge(task.priority)}`}
                                >
                                  {task.priority
                                    ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
                                    : "Medium"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="glass-button-destructive h-8 w-8 text-slate-500 hover:text-red-600"
                                  onClick={() => handleDeleteTask(task.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {task.description && (
                              <p className={`text-sm mt-1 ${task.completed ? "text-slate-500" : "text-slate-600"}`}>
                                {task.description}
                              </p>
                            )}
                            <div
                              className={`flex flex-col sm:flex-row sm:items-center gap-2 mt-2 text-xs ${getMutedTextColor()}`}
                            >
                              <div className="flex items-center gap-1">
                                <Avatar className="h-5 w-5">
                                  <AvatarFallback className="text-[10px]">
                                    {getInitials(task.assignedToName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{task.assignedToName}</span>
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Due: {formatDate(task.dueDate)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="table">
                <div className="glass-table-container">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Status</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className={`text-center py-8 ${getMutedTextColor()}`}>
                            No tasks found. Create a new task or adjust your search filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedTasks.map((task) => (
                          <TableRow key={task.id} className={task.completed ? "bg-slate-50" : ""}>
                            <TableCell>
                              <CircleCheckbox
                                id={`table-task-${task.id}`}
                                checked={task.completed}
                                onCheckedChange={() => handleTaskToggle(task.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <label
                                  htmlFor={`table-task-${task.id}`}
                                  className={`font-medium ${task.completed ? "line-through text-slate-500" : ""}`}
                                >
                                  {task.title}
                                </label>
                                {task.description && (
                                  <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(task.assignedToName)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{task.assignedToName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs px-2 py-1 rounded-full border ${getPriorityBadge(task.priority)}`}
                              >
                                {task.priority
                                  ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
                                  : "Medium"}
                              </span>
                            </TableCell>
                            <TableCell>{task.dueDate ? formatDate(task.dueDate) : "No due date"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="glass-button-destructive h-8 w-8 text-slate-500 hover:text-red-600"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </ThemeWrapper>
  )
}
