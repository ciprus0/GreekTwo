"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/supabase-api"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    general: "",
  })

  const { toast } = useToast()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }))
    }
  }

  const handleCheckboxChange = (checked) => {
    setFormData((prev) => ({
      ...prev,
      rememberMe: checked,
    }))
  }

  const validateForm = () => {
    let valid = true
    const newErrors = { email: "", password: "", general: "" }

    if (!formData.email) {
      newErrors.email = "Email is required"
      valid = false
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
      valid = false
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Authenticate user with your existing API
      const member = await api.authenticateUser(formData.email, formData.password)

      if (!member) {
        setErrors((prev) => ({
          ...prev,
          general: "Invalid email or password",
        }))
        setIsLoading(false)
        return
      }

      // Check if member is approved
      if (!member.approved) {
        setErrors((prev) => ({
          ...prev,
          general: "Your account is pending approval by an administrator",
        }))
        setIsLoading(false)
        return
      }

      // Get organization details
      let organizationDetails = null
      if (member.organization_id) {
        organizationDetails = await api.getOrganizationById(member.organization_id)
      }

      // Get role definition to determine admin status
      let isRoleAdmin = false
      if (organizationDetails?.roles) {
        const userRole = organizationDetails.roles.find((r) => r.id === member.role)
        isRoleAdmin = userRole?.isAdmin || member.role === "admin"
      } else {
        isRoleAdmin = member.role === "admin" || member.role === "executive"
      }

      // Store authentication state in localStorage (existing logic)
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: member.id,
          name: member.name,
          email: member.email,
          chapter: member.chapter,
          university: member.university,
          role: member.role,
          isAdmin: isRoleAdmin,
          organizationId: member.organization_id,
          organizationDetails: organizationDetails,
        }),
      )

      // NEW: Also establish a Supabase session for storage operations
      console.log("Establishing Supabase session for storage operations...")
      try {
        // Try to sign in with Supabase using the same credentials
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (authError) {
          console.warn("Could not establish Supabase session:", authError.message)
          // Don't fail the login - just log the warning
          // The user can still use the app, but storage operations might need different handling
        } else {
          console.log("Supabase session established successfully:", authData.user?.id)
        }
      } catch (supabaseError) {
        console.warn("Supabase session creation failed:", supabaseError)
        // Don't fail the login - this is just for storage operations
      }

      // Handle "remember me" functionality
      if (formData.rememberMe) {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 30) // 30 days from now
        localStorage.setItem("rememberMe", "true")
        localStorage.setItem("rememberExpiry", expiryDate.toISOString())
      } else {
        // Clear remember me if not selected
        localStorage.removeItem("rememberMe")
        localStorage.removeItem("rememberExpiry")
      }

      toast({
      title: "Logged in Successfully!",
      description: "Welcome back to GreekOne.",
    })
      // Redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard")
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Login error:", error)
      setErrors((prev) => ({
        ...prev,
        general: "Login failed. Please try again.",
      }))
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black"></div>
        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-red-900/20 via-transparent to-red-800/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fillRule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fillOpacity=&quot;0.02&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;1&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        {/* Left Side - Branding */}
        <div className="w-full lg:w-1/2 p-6 md:p-8 lg:p-12 flex flex-col justify-center min-h-[40vh] lg:min-h-screen">
          <div className="glass-card p-8 md:p-12 rounded-3xl">
            <Link href="/" className="inline-flex items-center mb-8">
              <Image src="/logo.svg" alt="GreekOne Logo" width={48} height={48} className="h-12 w-auto" />
              <span className="ml-3 text-white font-bold text-2xl">GreekOne</span>
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Welcome Back</h1>
            <p className="text-slate-300 max-w-md leading-relaxed">
              Continue your journey with GreekOne. Access your chapter's dashboard and stay connected with your Greek
              life community.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 p-6 md:p-8 lg:p-12 flex items-center justify-center min-h-[60vh] lg:min-h-screen">
          <div className="w-full max-w-md">
            <div className="glass-card p-8 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {errors.general && (
                  <div className="glass-card-inner p-3 rounded-xl border border-red-500/20 bg-red-500/10">
                    <p className="text-red-300 text-sm">{errors.general}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className={`glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20 ${
                      errors.email ? "border-red-500/50" : ""
                    }`}
                  />
                  {errors.email && <p className="text-sm text-red-300">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white">
                      Password
                    </Label>
                    <Link href="/forgot-password" className="text-sm text-red-400 hover:text-red-300 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20 ${
                      errors.password ? "border-red-500/50" : ""
                    }`}
                  />
                  {errors.password && <p className="text-sm text-red-300">{errors.password}</p>}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={handleCheckboxChange}
                    className="border-white/20 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <Label htmlFor="remember" className="text-sm font-normal text-slate-300">
                    Remember me for 30 days
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full glass-card-solid bg-red-700/90 hover:bg-red-600 text-white text-base py-6 rounded-xl font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-slate-400">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-red-400 hover:text-red-300 transition-colors font-medium">
                    Register
                  </Link>
                </p>
                <p className="text-sm text-slate-400">
                  Need to create a new organization?{" "}
                  <Link
                    href="/register?type=create"
                    className="text-red-400 hover:text-red-300 transition-colors font-medium"
                  >
                    Create Organization
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .glass-card-solid {
          background: rgba(220, 38, 38, 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(220, 38, 38, 0.2);
          box-shadow: 0 8px 32px rgba(220, 38, 38, 0.1);
        }

        .glass-card-inner {
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  )
}
