"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { api } from "@/lib/supabase-api"
import { User, Mail, Lock, Building, Phone, GraduationCap, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone_number: "",
    major: "",
    organization_id: "",
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getCardClasses, getButtonClasses, getInputClasses } = useTextColors()

  useEffect(() => {
    loadOrganizations()
    
    // Check for organization group_id in URL
    const groupId = searchParams.get('org')
    if (groupId) {
      console.log('Loading organization by group_id:', groupId)
      // Find organization by group_id
      api.getOrganizationByGroupId(groupId).then(org => {
        if (org) {
          console.log('Found organization:', org)
          setSelectedOrganization(org)
          setFormData(prev => ({ ...prev, organization_id: org.id }))
        } else {
          console.error('Organization not found for group_id:', groupId)
        }
      }).catch(err => {
        console.error('Error loading organization:', err)
      })
    }
  }, [searchParams])

  const loadOrganizations = async () => {
    try {
      const orgs = await api.getAllOrganizations()
      setOrganizations(orgs)
    } catch (error) {
      console.error('Error loading organizations:', error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // If organization is being changed, update selected organization
    if (field === 'organization_id') {
      const org = organizations.find(o => o.id === value)
      setSelectedOrganization(org || null)
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      })
      return false
    }

    if (!formData.email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email",
        variant: "destructive",
      })
      return false
    }

    if (!formData.password) {
      toast({
        title: "Error",
        description: "Please enter a password",
        variant: "destructive",
      })
      return false
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return false
    }

    if (!formData.organization_id) {
      toast({
        title: "Error",
        description: "Please select an organization",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Ensure we have the correct organization ID
    const organizationId = selectedOrganization?.id || formData.organization_id
    console.log('Selected organization:', selectedOrganization)
    console.log('Form organization_id:', formData.organization_id)
    console.log('Final organizationId:', organizationId)
    
    if (!organizationId) {
      toast({
        title: "Error",
        description: "No organization selected. Please try again.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Create the member
      const memberData = {
        name: formData.name,
        email: formData.email,
        password: formData.password, // This will be hashed in the API
        phone_number: formData.phone_number || null,
        major: formData.major || null,
        organization_id: organizationId, // Use the correct UUID
        approved: false, // Requires admin approval
        roles: ["New Member"], // Default role
        join_date: new Date().toISOString(),
      }

      const newMember = await api.createMember(memberData)

      toast({
        title: "Success",
        description: "Registration successful! Please wait for admin approval.",
      })

      // Redirect to login page
      router.push('/login')
    } catch (error: any) {
      console.error('Registration error:', error)
      toast({
        title: "Error",
        description: error.message || "Registration failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${theme === 'dark' ? 'bg-slate-800' : theme === 'light' ? 'bg-gradient-to-br from-blue-50 via-white to-blue-50' : 'bg-white'}`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            <span className={getTextColor()}>Back to Home</span>
          </Link>
          <Image 
            src={theme === 'dark' ? '/logo-white.svg' : '/logo.svg'} 
            alt="GreekOne Logo" 
            width={48} 
            height={48} 
            className="mx-auto mb-4" 
          />
          <h1 className={`text-2xl font-bold ${getTextColor()}`}>Join GreekOne</h1>
          <p className={`text-sm ${getTextColor()}`}>
            {selectedOrganization ? `Join ${selectedOrganization.name}` : 'Create your account'}
          </p>
        </div>

        <Card className={getCardClasses()}>
          <CardHeader>
            <CardTitle className={getTextColor()}>Register</CardTitle>
            <CardDescription className={getTextColor()}>
              Create your account to join the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name" className={getTextColor()}>
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={getInputClasses()}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className={getTextColor()}>
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={getInputClasses()}
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password" className={getTextColor()}>
                  <Lock className="h-4 w-4 inline mr-2" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={getInputClasses()}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword" className={getTextColor()}>
                  <Lock className="h-4 w-4 inline mr-2" />
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={getInputClasses()}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <Label htmlFor="phone" className={getTextColor()}>
                  <Phone className="h-4 w-4 inline mr-2" />
                  Phone Number (Optional)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  className={getInputClasses()}
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Major */}
              <div>
                <Label htmlFor="major" className={getTextColor()}>
                  <GraduationCap className="h-4 w-4 inline mr-2" />
                  Major (Optional)
                </Label>
                <Input
                  id="major"
                  type="text"
                  value={formData.major}
                  onChange={(e) => handleInputChange('major', e.target.value)}
                  className={getInputClasses()}
                  placeholder="Enter your major"
                />
              </div>

              {/* Organization */}
              <div>
                <Label htmlFor="organization" className={getTextColor()}>
                  <Building className="h-4 w-4 inline mr-2" />
                  Group ID
                </Label>
                <Select
                  value={formData.organization_id}
                  onValueChange={(value) => handleInputChange('organization_id', value)}
                  disabled={!!searchParams.get('org')} // Disable if org is in URL
                >
                  <SelectTrigger className={getInputClasses()}>
                    <SelectValue placeholder="Select your organization" />
                  </SelectTrigger>
                                     <SelectContent>
                     {organizations.map((org) => (
                       <SelectItem key={org.id} value={org.id}>
                         {org.name} ({org.group_id})
                       </SelectItem>
                     ))}
                   </SelectContent>
                </Select>
                {searchParams.get('org') && (
                  <p className="text-xs text-green-500 mt-1">
                    Organization pre-filled from invitation link
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className={`w-full ${getButtonClasses()}`}
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className={`text-sm ${getTextColor()}`}>
                Already have an account?{" "}
                <Link href="/login" className="text-red-400 hover:text-red-300">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
