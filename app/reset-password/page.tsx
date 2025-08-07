"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/supabase-api"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { ArrowLeft, Lock, CheckCircle, Eye, EyeOff } from "lucide-react"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [token, setToken] = useState("")
  const [email, setEmail] = useState("")
  const [user, setUser] = useState<any>(null)

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getCardClasses, getButtonClasses, getInputClasses } = useTextColors()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    
    if (!tokenParam) {
      toast({
        title: "Error",
        description: "Invalid reset link. Please request a new password reset.",
        variant: "destructive",
      })
      router.push('/forgot-password')
      return
    }

    setToken(tokenParam)

    // Validate the token
    validateToken(tokenParam)
  }, [searchParams])

  const validateToken = async (token: string) => {
    try {
      const validation = await api.validatePasswordResetToken(token)
      if (!validation.success) {
        toast({
          title: "Error",
          description: validation.error || "Invalid or expired reset token",
          variant: "destructive",
        })
        router.push('/forgot-password')
        return
      }
      setUser(validation.user)
      setEmail(validation.user.email)
    } catch (error) {
      console.error('Error validating token:', error)
      toast({
        title: "Error",
        description: "Failed to validate reset token. Please try again.",
        variant: "destructive",
      })
      router.push('/forgot-password')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Call the reset password API
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: result.error || "Failed to reset password",
          variant: "destructive",
        })
        return
      }

      setSuccess(true)
      
      toast({
        title: "Success",
        description: "Password updated successfully",
      })
    } catch (error) {
      console.error('Error updating password:', error)
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card border-white/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-200/30">
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
            <CardTitle className="text-xl text-white">Password Updated</CardTitle>
            <CardDescription className="text-slate-300">
              Your password has been successfully updated
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-green-500/10 backdrop-blur-sm rounded-lg border border-green-200/20">
              <p className="text-sm text-green-200">
                You can now log in with your new password.
              </p>
            </div>
            <Link href="/login">
              <Button
                className="w-full bg-green-600/80 hover:bg-green-700/80 backdrop-blur-sm border border-green-500/30"
              >
                Go to Login
              </Button>
            </Link>
            <p className="text-xs text-slate-400">
              For security reasons, please log out of all other devices.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card border-white/20">
          <CardContent className="text-center py-12">
            <div className="text-white">Verifying your account...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card border-white/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-blue-200/30">
            <Lock className="h-8 w-8 text-blue-300" />
          </div>
          <CardTitle className="text-xl text-white">Reset Password</CardTitle>
          <CardDescription className="text-slate-300">
            Set a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-500/10 backdrop-blur-sm rounded-lg border border-blue-200/20">
            <p className="text-sm text-blue-200">
              <strong>Account:</strong> {user.name} ({email})
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password" className={getTextColor()}>
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={getInputClasses()}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Password must be at least 8 characters long
              </p>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword" className={getTextColor()}>
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={getInputClasses()}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className={`w-full ${getButtonClasses()}`}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
            
            <div className="text-center">
              <Link href="/login">
                <Button
                  type="button"
                  variant="outline"
                  className="backdrop-blur-sm border border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </form>
          
          <div className="mt-6 p-4 bg-yellow-500/10 backdrop-blur-sm rounded-lg border border-yellow-200/20">
            <p className="text-sm text-yellow-200">
              <strong>Security Tip:</strong> Choose a strong password that you don't use elsewhere.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 