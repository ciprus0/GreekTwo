"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/supabase-api"
import { useTheme } from "@/lib/theme-context"
import { useTextColors } from "@/components/theme-wrapper"
import { ArrowLeft, Mail, CheckCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [userFound, setUserFound] = useState<any>(null)

  const { toast } = useToast()
  const { theme } = useTheme()
  const { getTextColor, getCardClasses, getButtonClasses, getInputClasses } = useTextColors()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // Check if user exists
      const user = await api.getMemberByEmail(email)
      if (!user) {
        toast({
          title: "Error",
          description: "No account found with this email address",
          variant: "destructive",
        })
        return
      }

      setUserFound(user)

      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const resetUrl = `${window.location.origin}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

      // Store reset token in database (you'll need to add this to your API)
      // For now, we'll simulate the email sending
      console.log('Reset URL:', resetUrl)

      // Send password reset email
      // const emailService = require('@/lib/email-service').default
      // await emailService.sendPasswordResetEmail(email, resetToken, resetUrl)

      setEmailSent(true)
      
      toast({
        title: "Success",
        description: "Password reset email sent successfully",
      })
    } catch (error) {
      console.error('Error sending password reset email:', error)
      toast({
        title: "Error",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md glass-card border-white/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-green-200/30">
              <CheckCircle className="h-8 w-8 text-green-300" />
            </div>
            <CardTitle className="text-xl text-white">Check Your Email</CardTitle>
            <CardDescription className="text-slate-300">
              We've sent a password reset link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-blue-500/10 backdrop-blur-sm rounded-lg border border-blue-200/20">
              <p className="text-sm text-blue-200">
                <strong>Email:</strong> {email}
              </p>
              {userFound && (
                <p className="text-sm text-blue-200 mt-1">
                  <strong>Name:</strong> {userFound.name}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-slate-300">
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </p>
              <p className="text-sm text-slate-300">
                If you don't see the email, check your spam folder.
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => {
                  setEmailSent(false)
                  setEmail("")
                  setUserFound(null)
                }}
                className="w-full bg-blue-600/80 hover:bg-blue-700/80 backdrop-blur-sm border border-blue-500/30"
              >
                Send Another Email
              </Button>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="w-full backdrop-blur-sm border border-white/20 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Need help? Contact your chapter administrator.
            </p>
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
            <Mail className="h-8 w-8 text-blue-300" />
          </div>
          <CardTitle className="text-xl text-white">Forgot Password</CardTitle>
          <CardDescription className="text-slate-300">
            Enter your email address to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className={getTextColor()}>
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className={getInputClasses()}
                required
              />
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className={`w-full ${getButtonClasses()}`}
            >
              {loading ? "Sending..." : "Send Reset Link"}
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
          
          <div className="mt-6 p-4 bg-blue-500/10 backdrop-blur-sm rounded-lg border border-blue-200/20">
            <p className="text-sm text-blue-200">
              <strong>Note:</strong> You must use the same email address that you used when registering for your account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 