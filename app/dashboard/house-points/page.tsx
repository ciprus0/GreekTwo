"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api, type HousePointActivity, type HousePointSubmission, type Member } from "@/lib/supabase-api"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { Calendar, Clock, Users, Plus, Settings, BarChart3, Upload, QrCode, Award, CheckCircle, XCircle, Clock as ClockIcon } from "lucide-react"
import QRCode from 'qrcode'
import QrReader from 'react-qr-reader'

export default function HousePointsPage() {
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<HousePointActivity[]>([])
  const [userPoints, setUserPoints] = useState(0)
  const [userSubmissions, setUserSubmissions] = useState<Record<string, HousePointSubmission>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<HousePointActivity | null>(null)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [organizationData, setOrganizationData] = useState<any>(null)
  const [requirement, setRequirement] = useState(0)
  const [pendingSubmissions, setPendingSubmissions] = useState<HousePointSubmission[]>([])
  
  // Create activity form state
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    points: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    submission_type: 'qr' as 'qr' | 'file'
  })

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getSecondaryTextColor, getMutedTextColor, getCardClasses, getButtonClasses, getInputClasses, getDialogClasses } = useTextColors()
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

      // Get organization ID from user metadata (like mobile app)
      const organizationId = user.user_metadata?.organization_id || user.organizationId || user.organization_id
      
      if (!organizationId) {
        console.error('No organization ID found')
        toast({
          title: "Error",
          description: "No organization found",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      // Load all data in parallel
      await Promise.all([
        fetchUserProfile(user),
        fetchOrganizationData(user),
        fetchActivities(user),
        fetchUserPoints(user),
        fetchUserSubmissions(user),
        fetchRequirement(user),
        fetchPendingSubmissions(user)
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load house points data",
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
        
        // Check if user is admin
        if (member.roles) {
          const roles = Array.isArray(member.roles) ? member.roles : member.roles.split(',').map((r: string) => r.trim())
          const hasAdminRole = roles.some(role => 
            role.toLowerCase().includes('admin') || 
            role.toLowerCase().includes('president') || 
            role.toLowerCase().includes('vice') ||
            role.toLowerCase().includes('owner')
          )
          setIsAdmin(hasAdminRole)
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const fetchOrganizationData = async (user: any) => {
    try {
      const organizationId = user.user_metadata?.organization_id || user.organizationId || user.organization_id
      const org = await api.getOrganizationById(organizationId)
      if (org) {
        setOrganizationData(org)
      }
    } catch (error) {
      console.error('Error fetching organization data:', error)
    }
  }

  const fetchActivities = async (user: any) => {
    try {
      const organizationId = user.user_metadata?.organization_id || user.organizationId || user.organization_id
      const activities = await api.getHousePointActivitiesByOrganization(organizationId)
      console.log('Fetched activities:', activities)
      setActivities(activities)
    } catch (error) {
      console.error('Error fetching activities:', error)
    }
  }

  const fetchUserPoints = async (user: any) => {
    try {
      const organizationId = user.user_metadata?.organization_id || user.organizationId || user.organization_id
      const userPoints = await api.getHousePointUser(user.id, organizationId)
      if (userPoints) {
        setUserPoints(userPoints.total_points)
      }
    } catch (error) {
      console.error('Error fetching user points:', error)
    }
  }

  const fetchUserSubmissions = async (user: any) => {
    try {
      const submissions: Record<string, HousePointSubmission> = {}
      for (const activity of activities) {
        try {
          const activitySubmissions = await api.getHousePointSubmissionsByActivity(activity.id)
          const userSubmission = activitySubmissions.find(sub => sub.user_id === user.id)
          if (userSubmission) {
            submissions[activity.id] = userSubmission
          }
        } catch (error) {
          console.error('Error fetching activity submissions:', error)
        }
      }
      setUserSubmissions(submissions)
    } catch (error) {
      console.error('Error fetching user submissions:', error)
    }
  }

  const fetchRequirement = async (user: any) => {
    try {
      const organizationId = user.user_metadata?.organization_id || user.organizationId || user.organization_id
      const org = await api.getOrganizationById(organizationId)
      if (org?.hour_requirements) {
        const housePointsRequirement = org.hour_requirements.find(req => req.type === 'housePoints')
        if (housePointsRequirement) {
          setRequirement(housePointsRequirement.hoursRequired)
        }
      }
    } catch (error) {
      console.error('Error fetching requirement:', error)
    }
  }

  const fetchPendingSubmissions = async (user: any) => {
    try {
      if (!isAdmin) return
      
      const allSubmissions: HousePointSubmission[] = []
      for (const activity of activities) {
        try {
          const activitySubmissions = await api.getHousePointSubmissionsByActivity(activity.id)
          const pendingSubs = activitySubmissions.filter(sub => sub.status === 'pending')
          allSubmissions.push(...pendingSubs)
        } catch (error) {
          console.error('Error fetching activity submissions:', error)
        }
      }
      setPendingSubmissions(allSubmissions)
    } catch (error) {
      console.error('Error fetching pending submissions:', error)
    }
  }

  const createActivity = async () => {
    try {
      if (!userProfile) return

      const organizationId = userProfile.user_metadata?.organization_id || userProfile.organizationId || userProfile.organization_id
      
      // Generate QR code like mobile app
      const qrCode = `HP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Fix date handling to avoid timezone issues
      const activityData = {
        ...newActivity,
        points: parseInt(newActivity.points),
        qr_code: qrCode,
        start_date: newActivity.start_date, // Keep as YYYY-MM-DD format
        end_date: newActivity.end_date, // Keep as YYYY-MM-DD format
        organization_id: organizationId,
        created_by: userProfile.id
      }

      const result = await api.createHousePointActivity(activityData)
      console.log('Activity created:', result)
      
      toast({
        title: "Success",
        description: "Activity created successfully",
      })
      
      setShowCreateModal(false)
      setNewActivity({
        title: '',
        description: '',
        points: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        submission_type: 'qr'
      })
      
      // Refresh data
      await fetchActivities(userProfile)
      await fetchUserPoints(userProfile)
    } catch (error) {
      console.error('Error creating activity:', error)
      toast({
        title: "Error",
        description: "Failed to create activity",
        variant: "destructive",
      })
    }
  }

  const handleUploadFile = async (activity: HousePointActivity) => {
    try {
      setSelectedActivity(activity)
      setShowUploadModal(true)
    } catch (error) {
      console.error('Error opening upload modal:', error)
    }
  }

  const handleShowQR = async (activity: HousePointActivity) => {
    try {
      setSelectedActivity(activity)
      
      // Generate QR code data URL
      if (activity.qr_code) {
        console.log('Generating QR code for:', activity.qr_code)
        const dataUrl = await QRCode.toDataURL(activity.qr_code, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeDataUrl(dataUrl)
      } else {
        console.error('No QR code found for activity:', activity)
        setQrCodeDataUrl('')
      }
      
      setShowQRModal(true)
    } catch (error) {
      console.error('Error showing QR code:', error)
      setQrCodeDataUrl('')
    }
  }

  const handleScanQR = async (activity: HousePointActivity) => {
    try {
      // Check if activity has started
      const now = new Date()
      const startDate = new Date(activity.start_date + 'T' + activity.start_time)
      const endDate = new Date(activity.end_date + 'T' + activity.end_time)
      
      if (now < startDate) {
        toast({
          title: "Activity Not Started",
          description: "This activity has not started yet.",
          variant: "destructive",
        })
        return
      }
      
      if (now > endDate) {
        toast({
          title: "Activity Expired",
          description: "This activity has already ended.",
          variant: "destructive",
        })
        return
      }
      
      // Open QR scanner
      setSelectedActivity(activity)
      setShowQRScanner(true)
    } catch (error) {
      console.error('Error opening QR scanner:', error)
    }
  }

  const handleQRScan = async (data: string | null) => {
    if (!data || !selectedActivity) return
    
    setShowQRScanner(false)
    
    // Check if QR code matches the activity
    if (data === selectedActivity.qr_code) {
      await submitSubmission(selectedActivity, data, 'qr')
    } else {
      toast({
        title: "Invalid QR Code",
        description: "The scanned QR code does not match this activity.",
        variant: "destructive",
      })
    }
  }

  const handleQRScanError = (error: any) => {
    console.error('QR Scan Error:', error)
    toast({
      title: "Camera Error",
      description: "Failed to access camera. Please check permissions.",
      variant: "destructive",
    })
  }

  const submitSubmission = async (activity: HousePointActivity, submissionData: string, submissionType: 'qr' | 'file') => {
    try {
      if (!userProfile) return

      const submission = {
        activity_id: activity.id,
        user_id: userProfile.id,
        submission_type: submissionType,
        file_url: submissionType === 'file' ? submissionData : undefined,
        status: 'pending' as const,
        points_awarded: 0
      }

      await api.createHousePointSubmission(submission)
      
      toast({
        title: "Success",
        description: submissionType === 'qr' 
          ? `QR code scanned successfully! Submission pending admin approval.` 
          : "File uploaded successfully! Submission pending admin approval.",
      })
      
      setShowUploadModal(false)
      setSelectedActivity(null)
      
      // Refresh data
      await fetchUserSubmissions(userProfile)
    } catch (error) {
      console.error('Error submitting submission:', error)
      toast({
        title: "Error",
        description: "Failed to submit submission",
        variant: "destructive",
      })
    }
  }

  const approveSubmission = async (submissionId: string, points: number) => {
    try {
      if (!userProfile) return

      await api.updateHousePointSubmission(submissionId, {
        status: 'approved',
        points_awarded: points,
        reviewed_by: userProfile.id,
        reviewed_at: new Date().toISOString()
      })
      
      toast({
        title: "Success",
        description: "Submission approved successfully",
      })
      
      // Refresh data
      await Promise.all([
        fetchPendingSubmissions(userProfile),
        fetchUserSubmissions(userProfile)
      ])
    } catch (error) {
      console.error('Error approving submission:', error)
      toast({
        title: "Error",
        description: "Failed to approve submission",
        variant: "destructive",
      })
    }
  }

  const rejectSubmission = async (submissionId: string) => {
    try {
      if (!userProfile) return

      await api.updateHousePointSubmission(submissionId, {
        status: 'rejected',
        reviewed_by: userProfile.id,
        reviewed_at: new Date().toISOString()
      })
      
      toast({
        title: "Success",
        description: "Submission rejected successfully",
      })
      
      // Refresh data
      await Promise.all([
        fetchPendingSubmissions(userProfile),
        fetchUserSubmissions(userProfile)
      ])
    } catch (error) {
      console.error('Error rejecting submission:', error)
      toast({
        title: "Error",
        description: "Failed to reject submission",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString: string) => {
    // Fix timezone issue by creating date in local timezone
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day).toLocaleDateString()
  }

  const formatTime = (timeString: string) => {
    return timeString
  }

  const isActivityExpired = (activity: HousePointActivity) => {
    const now = new Date()
    const endDate = new Date(activity.end_date + 'T' + activity.end_time)
    return now > endDate
  }

  const isActivityStarted = (activity: HousePointActivity) => {
    const now = new Date()
    const startDate = new Date(activity.start_date + 'T' + activity.start_time)
    return now >= startDate
  }

  const getSubmissionStatus = (activityId: string) => {
    const submission = userSubmissions[activityId]
    if (!submission) return 'not_submitted'
    return submission.status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': 
      case 'auto_approved': 
        return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'rejected': return 'bg-red-500'
      case 'not_submitted': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': 
      case 'auto_approved': 
        return 'Approved'
      case 'pending': return 'Pending'
      case 'rejected': return 'Rejected'
      case 'not_submitted': return 'Not Submitted'
      default: return 'Unknown'
    }
  }

  const ActivityCard = ({ activity }: { activity: HousePointActivity }) => {
    const status = getSubmissionStatus(activity.id)
    const expired = isActivityExpired(activity)

    return (
      <Card className={getCardClasses()}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className={getTextColor()}>{activity.title}</CardTitle>
            <Badge className={getStatusColor(status)}>
              {getStatusText(status)}
            </Badge>
          </div>
          <CardDescription className={getTextColor()}>
            {activity.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
              <Award className="h-4 w-4" />
              <span>{activity.points} points</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
              <Calendar className="h-4 w-4" />
              <span>{formatDate(activity.start_date)} - {formatDate(activity.end_date)}</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
              <Clock className="h-4 w-4" />
              <span>{formatTime(activity.start_time)} - {formatTime(activity.end_time)}</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${getSecondaryTextColor()}`}>
              {activity.submission_type === 'qr' ? (
                <QrCode className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{activity.submission_type === 'qr' ? 'QR Code' : 'File Upload'}</span>
            </div>
          </div>
          
                     <div className="mt-4 flex gap-2">
             {status === 'not_submitted' && !expired && (
               <>
                 {activity.submission_type === 'qr' ? (
                   <>
                     <Button 
                       onClick={() => handleScanQR(activity)}
                       disabled={!isActivityStarted(activity)}
                       className={isActivityStarted(activity) ? getButtonClasses() : "opacity-50 cursor-not-allowed"}
                       title={!isActivityStarted(activity) ? "Activity has not started yet" : ""}
                     >
                       <QrCode className="h-4 w-4 mr-2" />
                       {isActivityStarted(activity) ? "Scan QR" : "Not Started"}
                     </Button>
                     {isAdmin && (
                       <Button 
                         onClick={() => handleShowQR(activity)}
                         className={getButtonClasses()}
                       >
                         <QrCode className="h-4 w-4 mr-2" />
                         Show QR Code
                       </Button>
                     )}
                   </>
                 ) : (
                   <Button 
                     onClick={() => handleUploadFile(activity)}
                     className={getButtonClasses()}
                   >
                     <Upload className="h-4 w-4 mr-2" />
                     Upload File
                   </Button>
                 )}
               </>
             )}
            {status === 'pending' && (
              <Button variant="outline" disabled>
                <ClockIcon className="h-4 w-4 mr-2" />
                Pending Review
              </Button>
            )}
                         {(status === 'approved' || status === 'auto_approved') && (
               <Button variant="outline" disabled>
                 <CheckCircle className="h-4 w-4 mr-2" />
                 Approved
               </Button>
             )}
            {status === 'rejected' && (
              <Button variant="outline" disabled>
                <XCircle className="h-4 w-4 mr-2" />
                Rejected
              </Button>
            )}
            {expired && status === 'not_submitted' && (
              <Button variant="outline" disabled>
                Expired
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'} flex items-center justify-center p-4`}>
        <div className={getTextColor()}>Loading house points...</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${getTextColor()}`}>House Points</h1>
            <p className={`text-lg ${getTextColor()}`}>Track your house points and activities</p>
          </div>
          <div className="flex items-center gap-4">
            <Card className={getCardClasses()}>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getTextColor()}`}>{userPoints}</div>
                  <div className={`text-sm ${getSecondaryTextColor()}`}>Total Points</div>
                  {requirement > 0 && (
                    <div className={`text-xs ${getMutedTextColor()} mt-1`}>
                      Required: {requirement}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            {isAdmin && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className={getButtonClasses()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Activity
                </Button>
                <Button 
                  onClick={() => setShowSubmissionsModal(true)}
                  className={getButtonClasses()}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Review Submissions ({pendingSubmissions.length})
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activities.length === 0 ? (
            <Card className={getCardClasses()}>
              <CardContent className="text-center py-12">
                <Award className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className={`text-lg font-semibold ${getTextColor()}`}>No activities yet</h3>
                <p className={getSecondaryTextColor()}>Create an activity to get started</p>
              </CardContent>
            </Card>
          ) : (
            activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))
          )}
        </div>

        {/* Create Activity Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className={getDialogClasses()}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Create New Activity</DialogTitle>
              <DialogDescription className={getTextColor()}>
                Create a new house points activity
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className={getTextColor()}>Title</Label>
                <Input
                  id="title"
                  value={newActivity.title}
                  onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
              
              <div>
                <Label htmlFor="description" className={getTextColor()}>Description</Label>
                <Textarea
                  id="description"
                  value={newActivity.description}
                  onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
              
              <div>
                <Label htmlFor="points" className={getTextColor()}>Points</Label>
                <Input
                  id="points"
                  type="number"
                  value={newActivity.points}
                  onChange={(e) => setNewActivity({ ...newActivity, points: e.target.value })}
                  className={getInputClasses()}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date" className={getTextColor()}>Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newActivity.start_date}
                    onChange={(e) => setNewActivity({ ...newActivity, start_date: e.target.value })}
                    className={getInputClasses()}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date" className={getTextColor()}>End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newActivity.end_date}
                    onChange={(e) => setNewActivity({ ...newActivity, end_date: e.target.value })}
                    className={getInputClasses()}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time" className={getTextColor()}>Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={newActivity.start_time}
                    onChange={(e) => setNewActivity({ ...newActivity, start_time: e.target.value })}
                    className={getInputClasses()}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time" className={getTextColor()}>End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={newActivity.end_time}
                    onChange={(e) => setNewActivity({ ...newActivity, end_time: e.target.value })}
                    className={getInputClasses()}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="submission_type" className={getTextColor()}>Submission Type</Label>
                <Select
                  value={newActivity.submission_type}
                  onValueChange={(value: "qr" | "file") => setNewActivity({ ...newActivity, submission_type: value })}
                >
                  <SelectTrigger className={getInputClasses()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qr">QR Code</SelectItem>
                    <SelectItem value="file">File Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={createActivity} className={getButtonClasses()}>
                Create Activity
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

                 {/* Upload File Modal */}
         <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
           <DialogContent className={getDialogClasses()}>
             <DialogHeader>
               <DialogTitle className={getTextColor()}>Upload File</DialogTitle>
               <DialogDescription className={getTextColor()}>
                 Upload a file for {selectedActivity?.title}
               </DialogDescription>
             </DialogHeader>
             
             <div className="space-y-4">
               <div>
                 <Label htmlFor="file" className={getTextColor()}>Select File</Label>
                 <Input
                   id="file"
                   type="file"
                   accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                   onChange={(e) => {
                     const file = e.target.files?.[0]
                     if (file) {
                       // For now, we'll just use the file name as submission data
                       // In a real implementation, you'd upload the file to storage
                       submitSubmission(selectedActivity!, file.name, 'file')
                     }
                   }}
                   className={getInputClasses()}
                 />
                 <p className={`text-xs ${getSecondaryTextColor()} mt-1`}>
                   Accepted formats: PDF, DOC, DOCX, JPG, JPEG, PNG, TXT
                 </p>
               </div>
               <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                 <p className={`text-sm ${getSecondaryTextColor()}`}>
                   <strong>Note:</strong> In a production environment, files would be uploaded to secure storage. 
                   For now, only the filename is recorded.
                 </p>
               </div>
             </div>
             
             <DialogFooter>
               <Button variant="outline" onClick={() => setShowUploadModal(false)}>
                 Cancel
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>

        {/* Review Submissions Modal */}
        <Dialog open={showSubmissionsModal} onOpenChange={setShowSubmissionsModal}>
          <DialogContent className={getDialogClasses()}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>Review Submissions</DialogTitle>
              <DialogDescription className={getTextColor()}>
                Review pending submissions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {pendingSubmissions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className={getSecondaryTextColor()}>No pending submissions</p>
                </div>
              ) : (
                pendingSubmissions.map((submission) => (
                  <Card key={submission.id} className={getCardClasses()}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                                                 <div>
                           <h4 className={`font-semibold ${getTextColor()}`}>User {submission.user_id.slice(0, 8)}...</h4>
                           <p className={`text-sm ${getSecondaryTextColor()}`}>
                             {submission.submission_type === 'file' ? submission.file_url : 'QR Code Submission'}
                           </p>
                         </div>
                        <div className="flex gap-2">
                                                     <Button
                             size="sm"
                             onClick={() => {
                               const activity = activities.find(a => a.id === submission.activity_id)
                               approveSubmission(submission.id, activity?.points || 0)
                             }}
                             className="bg-green-600 hover:bg-green-700"
                           >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectSubmission(submission.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubmissionsModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
                 </Dialog>

         {/* QR Code Modal */}
         <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
           <DialogContent className={getDialogClasses()}>
             <DialogHeader>
               <DialogTitle className={getTextColor()}>QR Code for {selectedActivity?.title}</DialogTitle>
               <DialogDescription className={getTextColor()}>
                 Display this QR code for users to scan
               </DialogDescription>
             </DialogHeader>
             
             <div className="space-y-4">
               <div className="text-center">
                 <div className="bg-white p-4 rounded-lg inline-block">
                   {qrCodeDataUrl ? (
                     <img 
                       src={qrCodeDataUrl} 
                       alt="QR Code" 
                       className="w-48 h-48"
                     />
                   ) : (
                     <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                       <QrCode className="h-32 w-32 text-gray-400" />
                     </div>
                   )}
                 </div>
                 <p className={`text-sm ${getSecondaryTextColor()} mt-2 font-mono`}>
                   {selectedActivity?.qr_code || 'QR Code Data'}
                 </p>
               </div>
               <div className="text-center">
                 <p className={`text-sm ${getSecondaryTextColor()}`}>
                   Members can scan this code to earn {selectedActivity?.points} points
                 </p>
               </div>
             </div>
             
             <DialogFooter>
               <Button variant="outline" onClick={() => setShowQRModal(false)}>
                 Close
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>

         {/* QR Scanner Modal */}
         <Dialog open={showQRScanner} onOpenChange={setShowQRScanner}>
           <DialogContent className={getDialogClasses()}>
             <DialogHeader>
               <DialogTitle className={getTextColor()}>Scan QR Code</DialogTitle>
               <DialogDescription className={getTextColor()}>
                 Scan the QR code for {selectedActivity?.title}
               </DialogDescription>
             </DialogHeader>
             
             <div className="space-y-4">
               <div className="text-center">
                 <div className="bg-black p-4 rounded-lg inline-block">
                   <QrReader
                     delay={300}
                     onError={handleQRScanError}
                     onScan={handleQRScan}
                     style={{ width: '300px', height: '300px' }}
                     facingMode="environment"
                   />
                 </div>
               </div>
               <div className="text-center">
                 <p className={`text-sm ${getSecondaryTextColor()}`}>
                   Point your camera at the QR code to scan
                 </p>
               </div>
             </div>
             
             <DialogFooter>
               <Button variant="outline" onClick={() => setShowQRScanner(false)}>
                 Cancel
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </div>
     </div>
   )
 } 