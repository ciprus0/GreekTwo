"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { api, type Poll, type Election, type Member } from "@/lib/supabase-api"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { Calendar, Clock, Users, Vote, Plus, Settings, BarChart3, UserCheck } from "lucide-react"

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [elections, setElections] = useState<Election[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('polls')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [orgRoles, setOrgRoles] = useState<string[]>([])
  const [showCreatePollModal, setShowCreatePollModal] = useState(false)
  const [showVoteModal, setShowVoteModal] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null)
  const [selectedElection, setSelectedElection] = useState<Election | null>(null)
  const [userVotes, setUserVotes] = useState<Record<string, any>>({})
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [organizationFeatures, setOrganizationFeatures] = useState<any>({})
  
  // Poll creation state
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    options: [""],
    target_audience: "all" as "all" | "specific",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    allow_multiple_votes: false,
    anonymous: false,
  })

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getCardClasses, getButtonClasses, getInputClasses, getDialogClasses } = useTextColors()
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

      // Load all data in parallel
      await Promise.all([
        fetchUserProfile(user),
        fetchOrgRoles(user),
        fetchOrganizationFeatures(user),
        fetchMembers(user),
        fetchPollsData(user),
        fetchElectionsData(user)
      ])
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

  const fetchUserProfile = async (user: any) => {
    try {
      const member = await api.getMemberById(user.id)
      if (member) {
        setUserProfile(member)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchOrgRoles = async (user: any) => {
    try {
      const member = await api.getMemberById(user.id)
      if (member?.roles) {
        setOrgRoles(Array.isArray(member.roles) ? member.roles : member.roles.split(',').map((r: string) => r.trim()))
      }
    } catch (error) {
      console.error('Error fetching org roles:', error)
    }
  }

  const fetchOrganizationFeatures = async (user: any) => {
    try {
      const org = await api.getOrganizationById(user.organization_id)
      if (org?.features) {
        setOrganizationFeatures(org.features)
      }
    } catch (error) {
      console.error('Error fetching organization features:', error)
    }
  }

  const fetchMembers = async (user: any) => {
    try {
      const members = await api.getMembersByOrganization(user.organization_id)
      setMembers(members)
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }

  const fetchPollsData = async (user: any) => {
    try {
      const polls = await api.getPollsByOrganization(user.organization_id)
      setPolls(polls)
      
      // Fetch user votes for polls
      const userVotesData: Record<string, any> = {}
      for (const poll of polls) {
        try {
          const votes = await api.getPollVotesByPoll(poll.id)
          const userVote = votes.find(vote => vote.voter_id === user.id)
          if (userVote) {
            userVotesData[poll.id] = userVote
          }
        } catch (error) {
          console.error('Error fetching poll votes:', error)
        }
      }
      setUserVotes(userVotesData)
    } catch (error) {
      console.error('Error fetching polls:', error)
    }
  }

  const fetchElectionsData = async (user: any) => {
    try {
      const elections = await api.getElectionsByOrganization(user.organization_id)
      setElections(elections)
    } catch (error) {
      console.error('Error fetching elections:', error)
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

  const createPoll = async () => {
    try {
      if (!userProfile) return

      const pollData = {
        ...newPoll,
        organization_id: userProfile.organization_id,
        created_by: userProfile.id,
        target_members: newPoll.target_audience === 'specific' ? selectedMembers : undefined,
        status: 'active' as const
      }

      await api.createPoll(pollData)
      
      toast({
        title: "Success",
        description: "Poll created successfully",
      })
      
      setShowCreatePollModal(false)
      setNewPoll({
        title: "",
        description: "",
        options: [""],
        target_audience: "all",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        allow_multiple_votes: false,
        anonymous: false,
      })
      setSelectedMembers([])
      
      // Refresh data
      await fetchPollsData(userProfile)
    } catch (error) {
      console.error('Error creating poll:', error)
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive",
      })
    }
  }

  const submitVote = async (voteData: any) => {
    try {
      if (!userProfile) return

      await api.createPollVote({
        poll_id: voteData.pollId,
        voter_id: userProfile.id,
        selected_options: voteData.selectedOptions
      })
      
      toast({
        title: "Success",
        description: "Vote submitted successfully",
      })
      
      setShowVoteModal(false)
      setSelectedPoll(null)
      
      // Refresh data
      await fetchPollsData(userProfile)
    } catch (error) {
      console.error('Error submitting vote:', error)
      toast({
        title: "Error",
        description: "Failed to submit vote",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isPollExpired = (poll: Poll) => {
    return new Date(poll.end_time) < new Date()
  }

  const isElectionActive = (election: Election) => {
    const now = new Date()
    const startDate = new Date(election.start_date)
    const endDate = new Date(election.end_date)
    return now >= startDate && now <= endDate
  }

  const isElectionUpcoming = (election: Election) => {
    return new Date(election.start_date) > new Date()
  }

  const getPollStatus = (poll: Poll) => {
    if (isPollExpired(poll)) return 'expired'
    return 'active'
  }

  const getElectionStatus = (election: Election) => {
    if (isElectionActive(election)) return 'active'
    if (isElectionUpcoming(election)) return 'upcoming'
    return 'completed'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'upcoming': return 'bg-blue-500'
      case 'completed': return 'bg-gray-500'
      case 'expired': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const PollCard = ({ poll, userVote }: { poll: Poll; userVote?: any }) => {
    const status = getPollStatus(poll)
    const hasVoted = !!userVote

    return (
      <Card className={getCardClasses()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={getTextColor()}>{poll.title}</CardTitle>
            <Badge className={getStatusColor(status)}>
              {status}
            </Badge>
          </div>
          <CardDescription className={getTextColor()}>
            {poll.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(poll.start_time)} - {formatDate(poll.end_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{formatTime(poll.start_time)} - {formatTime(poll.end_time)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Vote className="h-4 w-4" />
              <span>{poll.options.length} options</span>
            </div>
            {poll.allow_multiple_votes && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>Multiple votes allowed</span>
              </div>
            )}
            {poll.anonymous && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <UserCheck className="h-4 w-4" />
                <span>Anonymous voting</span>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex gap-2">
            {!hasVoted && status === 'active' && (
              <Button 
                onClick={() => {
                  setSelectedPoll(poll)
                  setShowVoteModal(true)
                }}
                className={getButtonClasses()}
              >
                Vote
              </Button>
            )}
            {hasVoted && (
              <Button variant="outline" disabled>
                Voted
              </Button>
            )}
            {status === 'expired' && (
              <Button 
                onClick={() => {
                  setSelectedPoll(poll)
                  setShowVoteModal(true)
                }}
                variant="outline"
              >
                View Results
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const ElectionCard = ({ election }: { election: Election }) => {
    const status = getElectionStatus(election)

    return (
      <Card className={getCardClasses()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={getTextColor()}>{election.title}</CardTitle>
            <Badge className={getStatusColor(status)}>
              {status}
            </Badge>
          </div>
          <CardDescription className={getTextColor()}>
            {election.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(election.start_date)} - {formatDate(election.end_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BarChart3 className="h-4 w-4" />
              <span>{election.positions?.length || 0} positions</span>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            {status === 'active' && (
              <Button 
                onClick={() => router.push(`/dashboard/elections/vote/${election.id}`)}
                className={getButtonClasses()}
              >
                Vote Now
              </Button>
            )}
            {status === 'upcoming' && (
              <Button 
                onClick={() => router.push(`/dashboard/elections/nominate/${election.id}`)}
                variant="outline"
              >
                Nominate
              </Button>
            )}
            {status === 'completed' && (
              <Button 
                onClick={() => router.push(`/dashboard/elections/results/${election.id}`)}
                variant="outline"
              >
                View Results
              </Button>
            )}
            {isAdmin() && (
              <Button 
                onClick={() => router.push(`/dashboard/elections/manage/${election.id}`)}
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <div className="text-white">Loading polls and elections...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${getTextColor()}`}>Polls & Elections</h1>
            <p className={`text-lg ${getTextColor()}`}>Participate in polls and elections</p>
          </div>
          {isAdmin() && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowCreatePollModal(true)}
                className={getButtonClasses()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Poll
              </Button>
              <Button 
                onClick={() => router.push('/dashboard/elections/create')}
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
            <TabsTrigger value="polls">Polls ({polls.length})</TabsTrigger>
            <TabsTrigger value="elections">Elections ({elections.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="polls" className="space-y-6">
            {polls.length === 0 ? (
              <Card className={getCardClasses()}>
                <CardContent className="text-center py-12">
                  <Vote className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className={`text-lg font-semibold ${getTextColor()}`}>No polls yet</h3>
                  <p className="text-gray-500">Create a poll to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {polls.map((poll) => (
                  <PollCard 
                    key={poll.id} 
                    poll={poll} 
                    userVote={userVotes[poll.id]}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="elections" className="space-y-6">
            {elections.length === 0 ? (
              <Card className={getCardClasses()}>
                <CardContent className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className={`text-lg font-semibold ${getTextColor()}`}>No elections yet</h3>
                  <p className="text-gray-500">Create an election to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {elections.map((election) => (
                  <ElectionCard key={election.id} election={election} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Poll Modal */}
        <Dialog open={showCreatePollModal} onOpenChange={setShowCreatePollModal}>
          <DialogContent className={getDialogClasses()}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Create New Poll</DialogTitle>
              <DialogDescription className={getTextColor()}>
                Create a new poll for your organization
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className={getTextColor()}>Title</Label>
                <Input
                  id="title"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
              
              <div>
                <Label htmlFor="description" className={getTextColor()}>Description</Label>
                <Textarea
                  id="description"
                  value={newPoll.description}
                  onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
              
              <div>
                <Label className={getTextColor()}>Options</Label>
                <div className="space-y-2">
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newPoll.options]
                          newOptions[index] = e.target.value
                          setNewPoll({ ...newPoll, options: newOptions })
                        }}
                        className={getInputClasses()}
                        placeholder={`Option ${index + 1}`}
                      />
                      {newPoll.options.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOptions = newPoll.options.filter((_, i) => i !== index)
                            setNewPoll({ ...newPoll, options: newOptions })
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })}
                  >
                    Add Option
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="target_audience" className={getTextColor()}>Target Audience</Label>
                <Select
                  value={newPoll.target_audience}
                  onValueChange={(value: "all" | "specific") => setNewPoll({ ...newPoll, target_audience: value })}
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
              
              {newPoll.target_audience === 'specific' && (
                <div>
                  <Label className={getTextColor()}>Select Members</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {members.map((member) => (
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
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow_multiple_votes"
                  checked={newPoll.allow_multiple_votes}
                  onCheckedChange={(checked) => setNewPoll({ ...newPoll, allow_multiple_votes: checked })}
                />
                <Label htmlFor="allow_multiple_votes" className={getTextColor()}>
                  Allow multiple votes
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="anonymous"
                  checked={newPoll.anonymous}
                  onCheckedChange={(checked) => setNewPoll({ ...newPoll, anonymous: checked })}
                />
                <Label htmlFor="anonymous" className={getTextColor()}>
                  Anonymous voting
                </Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreatePollModal(false)}>
                Cancel
              </Button>
              <Button onClick={createPoll} className={getButtonClasses()}>
                Create Poll
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vote Modal */}
        <Dialog open={showVoteModal} onOpenChange={setShowVoteModal}>
          <DialogContent className={getDialogClasses()}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>
                {selectedPoll && isPollExpired(selectedPoll) ? 'Poll Results' : 'Vote'}
              </DialogTitle>
              <DialogDescription className={getTextColor()}>
                {selectedPoll?.description}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPoll && (
              <div className="space-y-4">
                <div>
                  <Label className={getTextColor()}>Options</Label>
                  <div className="space-y-2">
                    {selectedPoll.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`option-${index}`}
                          disabled={isPollExpired(selectedPoll)}
                        />
                        <Label htmlFor={`option-${index}`} className={getTextColor()}>
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVoteModal(false)}>
                Close
              </Button>
              {selectedPoll && !isPollExpired(selectedPoll) && (
                <Button onClick={() => submitVote({ pollId: selectedPoll.id, selectedOptions: [] })} className={getButtonClasses()}>
                  Submit Vote
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 