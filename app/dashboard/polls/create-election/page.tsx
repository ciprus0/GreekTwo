"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { ArrowLeft, Plus, X, Calendar, Clock, Users, Vote, BarChart3 } from "lucide-react"

export default function CreateElectionPage() {
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  
  const [electionData, setElectionData] = useState({
    title: "",
    description: "",
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    positions: [{ name: "", description: "" }]
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
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      })
    }
  }

  const addPosition = () => {
    setElectionData({
      ...electionData,
      positions: [...electionData.positions, { name: "", description: "" }]
    })
  }

  const removePosition = (index: number) => {
    if (electionData.positions.length > 1) {
      const newPositions = electionData.positions.filter((_, i) => i !== index)
      setElectionData({
        ...electionData,
        positions: newPositions
      })
    }
  }

  const updatePosition = (index: number, field: 'name' | 'description', value: string) => {
    const newPositions = [...electionData.positions]
    newPositions[index] = { ...newPositions[index], [field]: value }
    setElectionData({
      ...electionData,
      positions: newPositions
    })
  }

  const createElection = async () => {
    try {
      setLoading(true)

      // Validate form
      if (!electionData.title.trim()) {
        toast({
          title: "Error",
          description: "Please enter an election title",
          variant: "destructive",
        })
        return
      }

      if (electionData.positions.length === 0 || electionData.positions.some(pos => !pos.name.trim())) {
        toast({
          title: "Error",
          description: "Please add at least one position with a name",
          variant: "destructive",
        })
        return
      }

      if (new Date(electionData.end_date) <= new Date(electionData.start_date)) {
        toast({
          title: "Error",
          description: "End date must be after start date",
          variant: "destructive",
        })
        return
      }

      // TODO: Replace with actual API call
      console.log('Creating election:', electionData)
      
      toast({
        title: "Success",
        description: "Election created successfully",
      })
      
      router.push('/dashboard/polls')
    } catch (error) {
      console.error('Error creating election:', error)
      toast({
        title: "Error",
        description: "Failed to create election",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen p-6 overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'}`}>
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
            <h1 className={`text-3xl font-bold ${getTextColor()}`}>Create Election</h1>
            <p className={`text-lg ${getTextColor()}`}>Create a new election for your organization</p>
          </div>
        </div>

        <Card className={getCardClasses()}>
          <CardHeader>
            <CardTitle className={getTextColor()}>Election Details</CardTitle>
            <CardDescription className={getTextColor()}>
              Fill in the details for your new election
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title" className={getTextColor()}>Title *</Label>
              <Input
                id="title"
                value={electionData.title}
                onChange={(e) => setElectionData({ ...electionData, title: e.target.value })}
                className={getInputClasses()}
                placeholder="Enter election title"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className={getTextColor()}>Description</Label>
              <Textarea
                id="description"
                value={electionData.description}
                onChange={(e) => setElectionData({ ...electionData, description: e.target.value })}
                className={getInputClasses()}
                placeholder="Enter election description"
                rows={3}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date" className={getTextColor()}>Start Date *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={electionData.start_date}
                  onChange={(e) => setElectionData({ ...electionData, start_date: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
              <div>
                <Label htmlFor="end_date" className={getTextColor()}>End Date *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={electionData.end_date}
                  onChange={(e) => setElectionData({ ...electionData, end_date: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
            </div>

            {/* Positions */}
            <div>
              <Label className={getTextColor()}>Positions *</Label>
              <div className="space-y-4">
                {electionData.positions.map((position, index) => (
                  <Card key={index} className="p-4 border">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-medium ${getTextColor()}`}>Position {index + 1}</h4>
                        {electionData.positions.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePosition(index)}
                            className="px-3"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor={`position-${index}-name`} className={getTextColor()}>Position Name *</Label>
                        <Input
                          id={`position-${index}-name`}
                          value={position.name}
                          onChange={(e) => updatePosition(index, 'name', e.target.value)}
                          className={getInputClasses()}
                          placeholder="e.g., President, Treasurer"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor={`position-${index}-description`} className={getTextColor()}>Description</Label>
                        <Textarea
                          id={`position-${index}-description`}
                          value={position.description}
                          onChange={(e) => updatePosition(index, 'description', e.target.value)}
                          className={getInputClasses()}
                          placeholder="Describe the responsibilities of this position"
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addPosition}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Position
                </Button>
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
                onClick={createElection}
                disabled={loading}
                className={`flex-1 ${getButtonClasses()}`}
              >
                {loading ? "Creating..." : "Create Election"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 