"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/supabase-api"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { Settings, Users, Award, Calendar, BookOpen, MessageSquare, Megaphone, CheckSquare, Library, Dumbbell, Clock, Plus, X, Palette } from "lucide-react"

export default function ChapterCustomizationPage() {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  
  const [customization, setCustomization] = useState({
    // Features
    features: {
      study: true,
      tasks: true,
      events: true,
      library: true,
      messages: true,
      pledgeSystem: true,
      announcements: true,
    },
    // Pledge settings
    pledgeExemption: false,
    pledgeExemptions: {
      study: false,
      tasks: false,
      events: false,
      library: false,
      messages: false,
      announcements: false,
    },
    // Tracking system
    trackingSystem: 'hours', // 'hours' or 'housePoints'
    // Requirements
    requirements: {
      gym: 0,
      study: 0,
      housePoints: 0,
    },
    // Roles
    roles: [
      { id: 'group_owner', name: 'Group Owner', color: '#7c3aed', isAdmin: true, isDefault: true },
      { id: 'president', name: 'President', color: '#dc2626', isAdmin: true, isDefault: true },
      { id: 'treasurer', name: 'Treasurer', color: '#059669', isAdmin: false, isDefault: true },
      { id: 'active', name: 'Active', color: '#2563eb', isAdmin: false, isDefault: true },
      { id: 'new_member', name: 'New Member', color: '#f59e0b', isAdmin: false, isDefault: true },
    ],
  })

  const steps = [
    { title: 'Features', subtitle: 'Choose which features to enable', icon: Settings },
    { title: 'Pledge System', subtitle: 'Configure pledge exemptions', icon: Award },
    { title: 'Tracking System', subtitle: 'Choose hours or house points', icon: Clock },
    { title: 'Requirements', subtitle: 'Set activity requirements', icon: CheckSquare },
    { title: 'Roles', subtitle: 'Customize member roles', icon: Users },
    { title: 'Finish', subtitle: 'Complete setup', icon: CheckSquare },
  ]

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getCardClasses, getButtonClasses, getInputClasses, getDialogClasses } = useTextColors()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadData()
    }
  }, [])

  const loadData = async () => {
    try {
      // Get user from localStorage
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login')
        return
      }
      
      const userData = JSON.parse(userStr)
      setUser(userData)

      // Get organization data
      const org = await api.getOrganizationById(userData.organization_id)
      if (org) {
        setOrganization(org)
        
        // Load existing customization if available
        if (org.features) {
          setCustomization(prev => ({
            ...prev,
            features: org.features
          }))
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load organization data",
        variant: "destructive",
      })
    }
  }

  const toggleFeature = (feature: string) => {
    setCustomization(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }))
  }

  const togglePledgeExemption = (feature: string) => {
    setCustomization(prev => ({
      ...prev,
      pledgeExemptions: {
        ...prev.pledgeExemptions,
        [feature]: !prev.pledgeExemptions[feature]
      }
    }))
  }

  const updateRequirement = (type: string, value: number) => {
    setCustomization(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [type]: value
      }
    }))
  }

  const addRole = () => {
    setEditingRole({
      id: '',
      name: '',
      color: '#3b82f6',
      isAdmin: false,
      isDefault: false
    })
    setShowRoleModal(true)
  }

  const editRole = (role: any) => {
    setEditingRole(role)
    setShowRoleModal(true)
  }

  const deleteRole = (roleId: string) => {
    setCustomization(prev => ({
      ...prev,
      roles: prev.roles.filter(role => role.id !== roleId)
    }))
  }

  const saveRole = () => {
    if (!editingRole.name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required",
        variant: "destructive",
      })
      return
    }

    if (editingRole.id) {
      // Update existing role
      setCustomization(prev => ({
        ...prev,
        roles: prev.roles.map(role => 
          role.id === editingRole.id ? editingRole : role
        )
      }))
    } else {
      // Add new role
      const newRole = {
        ...editingRole,
        id: `role_${Date.now()}`,
        isDefault: false
      }
      setCustomization(prev => ({
        ...prev,
        roles: [...prev.roles, newRole]
      }))
    }

    setShowRoleModal(false)
    setEditingRole(null)
  }

  const saveCustomization = async () => {
    try {
      setLoading(true)

      if (!organization) return

      // Update organization with customization data
      await api.updateOrganization(organization.id, {
        features: customization.features,
        roles: customization.roles,
        hour_requirements: [
          {
            id: `req_${Date.now()}`,
            type: 'gym',
            name: 'Gym Hours',
            description: 'Required gym hours per semester',
            hoursRequired: customization.requirements.gym,
            targetUsers: ['all'],
            createdBy: user.id,
            createdAt: new Date().toISOString()
          },
          {
            id: `req_${Date.now() + 1}`,
            type: 'study',
            name: 'Study Hours',
            description: 'Required study hours per semester',
            hoursRequired: customization.requirements.study,
            targetUsers: ['all'],
            createdBy: user.id,
            createdAt: new Date().toISOString()
          },
          {
            id: `req_${Date.now() + 2}`,
            type: 'housePoints',
            name: 'House Points',
            description: 'Required house points per semester',
            hoursRequired: customization.requirements.housePoints,
            targetUsers: ['all'],
            createdBy: user.id,
            createdAt: new Date().toISOString()
          }
        ]
      })

      toast({
        title: "Success",
        description: "Chapter customization saved successfully",
      })

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving customization:', error)
      toast({
        title: "Error",
        description: "Failed to save customization",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getFeatureDescription = (feature: string) => {
    const descriptions = {
      study: 'Track study sessions and locations',
      tasks: 'Manage and assign tasks to members',
      events: 'Create and manage chapter events',
      library: 'Share and access chapter resources',
      messages: 'Internal messaging system',
      pledgeSystem: 'Pledge management and tracking',
      announcements: 'Chapter announcements and notifications'
    }
    return descriptions[feature] || ''
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Features
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Enable Features</h3>
              <p className="text-gray-500 mb-6">Choose which features to enable for your chapter</p>
            </div>
            
            <div className="grid gap-4">
              {Object.entries(customization.features).map(([feature, enabled]) => (
                <Card key={feature} className={getCardClasses()}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100/20 flex items-center justify-center">
                          {feature === 'study' && <BookOpen className="h-5 w-5 text-blue-300" />}
                          {feature === 'tasks' && <CheckSquare className="h-5 w-5 text-blue-300" />}
                          {feature === 'events' && <Calendar className="h-5 w-5 text-blue-300" />}
                          {feature === 'library' && <Library className="h-5 w-5 text-blue-300" />}
                          {feature === 'messages' && <MessageSquare className="h-5 w-5 text-blue-300" />}
                          {feature === 'pledgeSystem' && <Award className="h-5 w-5 text-blue-300" />}
                          {feature === 'announcements' && <Megaphone className="h-5 w-5 text-blue-300" />}
                        </div>
                        <div>
                          <h4 className={`font-medium ${getTextColor()}`}>
                            {feature.charAt(0).toUpperCase() + feature.slice(1).replace(/([A-Z])/g, ' $1')}
                          </h4>
                          <p className="text-sm text-gray-500">{getFeatureDescription(feature)}</p>
                        </div>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => toggleFeature(feature)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case 1: // Pledge System
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Pledge System</h3>
              <p className="text-gray-500 mb-6">Configure pledge exemptions for different features</p>
            </div>
            
            <div className="grid gap-4">
              {Object.entries(customization.pledgeExemptions).map(([feature, exempt]) => (
                <Card key={feature} className={getCardClasses()}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className={`font-medium ${getTextColor()}`}>
                          {feature.charAt(0).toUpperCase() + feature.slice(1).replace(/([A-Z])/g, ' $1')} Exemption
                        </h4>
                        <p className="text-sm text-gray-500">Pledges are exempt from {feature} requirements</p>
                      </div>
                      <Switch
                        checked={exempt}
                        onCheckedChange={() => togglePledgeExemption(feature)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case 2: // Tracking System
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Tracking System</h3>
              <p className="text-gray-500 mb-6">Choose how to track member participation</p>
            </div>
            
            <div className="grid gap-4">
              <Card className={getCardClasses()}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label className={getTextColor()}>Tracking Method</Label>
                      <Select
                        value={customization.trackingSystem}
                        onValueChange={(value) => setCustomization(prev => ({ ...prev, trackingSystem: value }))}
                      >
                        <SelectTrigger className={getInputClasses()}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Hours Tracking</SelectItem>
                          <SelectItem value="housePoints">House Points</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-200/20">
                      <p className="text-sm text-blue-200">
                        <strong>Hours Tracking:</strong> Members log their study and gym hours
                      </p>
                      <p className="text-sm text-blue-200 mt-1">
                        <strong>House Points:</strong> Members earn points for activities and events
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 3: // Requirements
        return (
          <div className="space-y-6">
            <div>
              <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Activity Requirements</h3>
              <p className="text-gray-500 mb-6">Set minimum requirements for different activities</p>
            </div>
            
            <div className="grid gap-4">
              <Card className={getCardClasses()}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="gym" className={getTextColor()}>Gym Hours Required</Label>
                      <Input
                        id="gym"
                        type="number"
                        value={customization.requirements.gym}
                        onChange={(e) => updateRequirement('gym', parseInt(e.target.value) || 0)}
                        className={getInputClasses()}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="study" className={getTextColor()}>Study Hours Required</Label>
                      <Input
                        id="study"
                        type="number"
                        value={customization.requirements.study}
                        onChange={(e) => updateRequirement('study', parseInt(e.target.value) || 0)}
                        className={getInputClasses()}
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="housePoints" className={getTextColor()}>House Points Required</Label>
                      <Input
                        id="housePoints"
                        type="number"
                        value={customization.requirements.housePoints}
                        onChange={(e) => updateRequirement('housePoints', parseInt(e.target.value) || 0)}
                        className={getInputClasses()}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )

      case 4: // Roles
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Member Roles</h3>
                <p className="text-gray-500 mb-6">Customize roles and permissions for your chapter</p>
              </div>
              <Button onClick={addRole} className={getButtonClasses()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </div>
            
            <div className="grid gap-4">
              {customization.roles.map((role) => (
                <Card key={role.id} className={getCardClasses()}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        <div>
                          <h4 className={`font-medium ${getTextColor()}`}>{role.name}</h4>
                          <p className="text-sm text-gray-500">
                            {role.isAdmin ? 'Admin Role' : 'Member Role'}
                            {role.isDefault && ' • Default'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editRole(role)}
                        >
                          Edit
                        </Button>
                        {!role.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteRole(role.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )

      case 5: // Finish
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100/20 rounded-full flex items-center justify-center">
                <CheckSquare className="h-8 w-8 text-green-300" />
              </div>
              <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Setup Complete!</h3>
              <p className="text-gray-500 mb-6">Your chapter has been customized successfully</p>
            </div>
            
            <Card className={getCardClasses()}>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div>
                    <h4 className={`font-medium ${getTextColor()} mb-2`}>Summary</h4>
                    <div className="space-y-2 text-sm text-gray-500">
                      <p>• {Object.values(customization.features).filter(Boolean).length} features enabled</p>
                      <p>• {customization.roles.length} roles configured</p>
                      <p>• Tracking system: {customization.trackingSystem}</p>
                      <p>• Requirements set for gym, study, and house points</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  if (!user || !organization) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${getTextColor()}`}>Chapter Customization</h1>
          <p className={`text-lg ${getTextColor()}`}>Configure your chapter settings and features</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              
              return (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isActive 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 text-gray-500'
                  }`}>
                    {isCompleted ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="mt-4 text-center">
            <h2 className={`text-xl font-semibold ${getTextColor()}`}>
              {steps[currentStep].title}
            </h2>
            <p className="text-gray-500">{steps[currentStep].subtitle}</p>
          </div>
        </div>

        {/* Step Content */}
        <Card className={getCardClasses()}>
          <CardContent className="p-6">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            className="backdrop-blur-sm border border-white/20 text-white hover:bg-white/10"
          >
            Previous
          </Button>
          
          <div className="flex space-x-2">
            {currentStep < steps.length - 1 ? (
              <Button onClick={nextStep} className={getButtonClasses()}>
                Next
              </Button>
            ) : (
              <Button 
                onClick={saveCustomization} 
                disabled={loading}
                className={getButtonClasses()}
              >
                {loading ? "Saving..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </div>

        {/* Role Modal */}
        <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
          <DialogContent className={getDialogClasses()}>
            <DialogHeader>
              <DialogTitle className={getTextColor()}>
                {editingRole?.id ? 'Edit Role' : 'Add Role'}
              </DialogTitle>
              <DialogDescription className={getTextColor()}>
                Configure role details and permissions
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="roleName" className={getTextColor()}>Role Name</Label>
                <Input
                  id="roleName"
                  value={editingRole?.name || ''}
                  onChange={(e) => setEditingRole(prev => ({ ...prev, name: e.target.value }))}
                  className={getInputClasses()}
                  placeholder="Enter role name"
                />
              </div>
              
              <div>
                <Label htmlFor="roleColor" className={getTextColor()}>Role Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="roleColor"
                    type="color"
                    value={editingRole?.color || '#3b82f6'}
                    onChange={(e) => setEditingRole(prev => ({ ...prev, color: e.target.value }))}
                    className="w-16 h-10 p-1"
                  />
                  <span className="text-sm text-gray-500">{editingRole?.color}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  checked={editingRole?.isAdmin || false}
                  onCheckedChange={(checked) => setEditingRole(prev => ({ ...prev, isAdmin: checked }))}
                />
                <Label className={getTextColor()}>Admin Role</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRoleModal(false)}>
                Cancel
              </Button>
              <Button onClick={saveRole} className={getButtonClasses()}>
                Save Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 