"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { Calendar, Clock, Users, Vote, Plus, Settings, BarChart3, UserCheck } from "lucide-react"

export default function PollsPage() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('polls')
  const [userProfile, setUserProfile] = useState<any>(null)

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getCardClasses, getButtonClasses } = useTextColors()
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadData()
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get user from localStorage
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }
      
      const user = JSON.parse(userStr)
      setUserProfile(user)

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load polls and elections data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = () => {
    if (!userProfile?.roles) return false
    const roles = Array.isArray(userProfile.roles) ? userProfile.roles : userProfile.roles.split(',').map((r: string) => r.trim())
    return roles.some(role => 
      role.toLowerCase().includes('admin') || 
      role.toLowerCase().includes('president') || 
      role.toLowerCase().includes('vice') ||
      role.toLowerCase().includes('owner')
    )
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'} flex items-center justify-center p-4`}>
        <div className={getTextColor()}>Loading polls and elections...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-6 overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${getTextColor()}`}>Polls & Elections</h1>
            <p className={`text-lg ${getTextColor()}`}>Participate in polls and elections</p>
          </div>
          {isAdmin() && (
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/dashboard/polls/create')}
                className={getButtonClasses()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Poll
              </Button>
              <Button 
                onClick={() => router.push('/dashboard/polls/create-election')}
                className={getButtonClasses()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Election
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="polls">Polls (0)</TabsTrigger>
            <TabsTrigger value="elections">Elections (0)</TabsTrigger>
          </TabsList>

          <TabsContent value="polls" className="space-y-6">
            <Card className={getCardClasses()}>
              <CardContent className="text-center py-12">
                <Vote className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className={`text-lg font-semibold ${getTextColor()}`}>No polls yet</h3>
                <p className="text-gray-500">Create a poll to get started</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="elections" className="space-y-6">
            <Card className={getCardClasses()}>
              <CardContent className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className={`text-lg font-semibold ${getTextColor()}`}>No elections yet</h3>
                <p className="text-gray-500">Create an election to get started</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 