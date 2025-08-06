"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { ArrowLeft, Plus, X, Calendar, Clock, Users, Vote } from "lucide-react"

export default function CreatePollPage() {
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  
  const [pollData, setPollData] = useState({
    title: "",
    description: "",
    options: [""],
    target_audience: "all" as "all" | "specific",
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    allow_multiple_votes: false,
    anonymous: false,
  })

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getCardClasses, getButtonClasses, getInputClasses } = useTextColors()
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadData()
    }
  }, [])

  const loadData = async () => {
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      setUserProfile(user)

      // Load members for specific audience selection
      // TODO: Replace with actual API call
      setMembers([])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    }
  }

  const addOption = () => {
    setPollData({
      ...pollData,
      options: [...pollData.options, ""]
    })
  }

  const removeOption = (index: number) => {
    if (pollData.options.length > 1) {
      const newOptions = pollData.options.filter((_, i) => i !== index)
      setPollData({
        ...pollData,
        options: newOptions
      })
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...pollData.options]
    newOptions[index] = value
    setPollData({
      ...pollData,
      options: newOptions
    })
  }

  const createPoll = async () => {
    try {
      setLoading(true)

      // Validate form
      if (!pollData.title.trim()) {
        toast({
          title: "Error",
          description: "Please enter a poll title",
          variant: "destructive",
        })
        return
      }

      if (pollData.options.length < 2 || pollData.options.some(opt => !opt.trim())) {
        toast({
          title: "Error",
          description: "Please add at least 2 valid options",
          variant: "destructive",
        })
        return
      }

      if (new Date(pollData.end_time) <= new Date(pollData.start_time)) {
        toast({
          title: "Error",
          description: "End time must be after start time",
          variant: "destructive",
        })
        return
      }

      // TODO: Replace with actual API call
      console.log('Creating poll:', pollData)
      
      toast({
        title: "Success",
        description: "Poll created successfully",
      })
      
      router.push('/dashboard/polls')
    } catch (error) {
      console.error('Error creating poll:', error)
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className={getButtonClasses()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className={`text-3xl font-bold ${getTextColor()}`}>Create Poll</h1>
            <p className={`text-lg ${getTextColor()}`}>Create a new poll for your organization</p>
          </div>
        </div>

        <Card className={getCardClasses()}>
          <CardHeader>
            <CardTitle className={getTextColor()}>Poll Details</CardTitle>
            <CardDescription className={getTextColor()}>
              Fill in the details for your new poll
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title" className={getTextColor()}>Title *</Label>
              <Input
                id="title"
                value={pollData.title}
                onChange={(e) => setPollData({ ...pollData, title: e.target.value })}
                className={getInputClasses()}
                placeholder="Enter poll title"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className={getTextColor()}>Description</Label>
              <Textarea
                id="description"
                value={pollData.description}
                onChange={(e) => setPollData({ ...pollData, description: e.target.value })}
                className={getInputClasses()}
                placeholder="Enter poll description"
                rows={3}
              />
            </div>

            {/* Options */}
            <div>
              <Label className={getTextColor()}>Options *</Label>
              <div className="space-y-2">
                {pollData.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className={getInputClasses()}
                      placeholder={`Option ${index + 1}`}
                    />
                    {pollData.options.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="px-3"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <Label htmlFor="target_audience" className={getTextColor()}>Target Audience</Label>
              <Select
                value={pollData.target_audience}
                onValueChange={(value: "all" | "specific") => setPollData({ ...pollData, target_audience: value })}
              >
                <SelectTrigger className={getInputClasses()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="specific">Specific Members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific Members Selection */}
            {pollData.target_audience === 'specific' && (
              <div>
                <Label className={getTextColor()}>Select Members</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  {members.length === 0 ? (
                    <p className="text-gray-500 text-sm">No members available</p>
                  ) : (
                    members.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={member.id}
                          checked={selectedMembers.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMembers([...selectedMembers, member.id])
                            } else {
                              setSelectedMembers(selectedMembers.filter(id => id !== member.id))
                            }
                          }}
                        />
                        <Label htmlFor={member.id} className={getTextColor()}>
                          {member.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time" className={getTextColor()}>Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={pollData.start_time}
                  onChange={(e) => setPollData({ ...pollData, start_time: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
              <div>
                <Label htmlFor="end_time" className={getTextColor()}>End Time *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={pollData.end_time}
                  onChange={(e) => setPollData({ ...pollData, end_time: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow_multiple_votes"
                  checked={pollData.allow_multiple_votes}
                  onCheckedChange={(checked) => setPollData({ ...pollData, allow_multiple_votes: checked })}
                />
                <Label htmlFor="allow_multiple_votes" className={getTextColor()}>
                  Allow multiple votes
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={pollData.anonymous}
                  onCheckedChange={(checked) => setPollData({ ...pollData, anonymous: checked })}
                />
                <Label htmlFor="anonymous" className={getTextColor()}>
                  Anonymous voting
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={createPoll}
                disabled={loading}
                className={`flex-1 ${getButtonClasses()}`}
              >
                {loading ? "Creating..." : "Create Poll"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 