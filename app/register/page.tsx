"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { api } from "@/lib/supabase-api"
import Link from "next/link"
import Image from "next/image"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [joinLoading, setJoinLoading] = useState(false)

  // Create Organization Form State
  const [orgName, setOrgName] = useState("")
  const [orgType, setOrgType] = useState("fraternity")
  const [university, setUniversity] = useState("")
  const [chapterDesignation, setChapterDesignation] = useState("")
  const [isColony, setIsColony] = useState(false)
  const [foundedYear, setFoundedYear] = useState(new Date().getFullYear().toString())
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [major, setMajor] = useState("")
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  // Join Organization Form State
  const [joinGroupId, setJoinGroupId] = useState("")
  const [joinName, setJoinName] = useState("")
  const [joinEmail, setJoinEmail] = useState("")
  const [joinPassword, setJoinPassword] = useState("")
  const [joinPhoneNumber, setJoinPhoneNumber] = useState("")
  const [joinMajor, setJoinMajor] = useState("")
  const [joinAgreeToTerms, setJoinAgreeToTerms] = useState(false)

  const handleCreateOrganization = async (e) => {
    e.preventDefault()

    if (!agreeToTerms) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must agree to the Terms & Conditions and Privacy Policy to continue.",
      })
      return
    }

    setLoading(true)

    try {
      // Generate a random 8-character group ID
      const groupId = Math.random().toString(36).substring(2, 10).toUpperCase()

      // Create the organization in Supabase
      const organization = await api.createOrganization({
        groupId,
        name: orgName,
        type: orgType,
        university,
        chapterDesignation,
        isColony,
        foundedYear: isColony ? "" : foundedYear,
      })

      // Create the admin member (Group Owner)
      const member = await api.createMember({
        name,
        email,
        password,
        phoneNumber,
        major,
        organizationId: organization.id,
        chapter: chapterDesignation,
        university,
        organizationType: orgType,
        approved: true, // Auto-approve the creator
        isOwner: true, // This will give them Group Owner role
      })

      // Update the organization with the created_by field
      await api.updateOrganization(organization.id, { created_by: member.id })

      // Store user data in localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: member.id,
          name: member.name,
          email: member.email,
          roles: member.roles,
          organizationId: organization.id,
          approved: true,
        }),
      )

      // Set authentication state
      localStorage.setItem("isAuthenticated", "true")

      toast({
        title: "Organization created!",
        description: `Your Group ID is ${groupId}. Share this with members to join.`,
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error creating organization:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create organization. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleJoinOrganization = async (e) => {
    e.preventDefault()

    if (!joinAgreeToTerms) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must agree to the Terms & Conditions and Privacy Policy to continue.",
      })
      return
    }

    setJoinLoading(true)

    try {
      // Find the organization by group ID
      const organization = await api.getOrganizationByGroupId(joinGroupId)

      if (!organization) {
        throw new Error("Organization not found. Please check the Group ID.")
      }

      // Create the member (New Member role by default)
      const member = await api.createMember({
        name: joinName,
        email: joinEmail,
        password: joinPassword,
        phoneNumber: joinPhoneNumber,
        major: joinMajor,
        organizationId: organization.id,
        chapter: organization.chapter_designation,
        university: organization.university,
        organizationType: organization.type,
        approved: false, // Requires approval from admin
        isOwner: false, // Regular member gets New Member role
      })

      // Store user data in localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: member.id,
          name: member.name,
          email: member.email,
          roles: member.roles,
          organizationId: organization.id,
          approved: false,
        }),
      )

      // Set authentication state
      localStorage.setItem("isAuthenticated", "true")

      toast({
        title: "Request submitted!",
        description: "Your request to join has been submitted and is pending approval.",
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error joining organization:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to join organization. Please try again.",
      })
    } finally {
      setJoinLoading(false)
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

      {/* Header */}
      <header className="relative z-50 container mx-auto py-6 px-4 md:px-6 flex items-center justify-between">
        <div className="glass-card px-4 py-2 rounded-full">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="GreekOne Logo" width={40} height={40} className="h-8 w-auto" />
            <span className="ml-2 text-white font-bold text-xl">GreekOne</span>
          </Link>
        </div>
        <Button
          asChild
          className="glass-card-solid bg-red-700/90 hover:bg-red-600 text-white rounded-full px-6 backdrop-blur-sm"
        >
          <Link href="/login">Sign In</Link>
        </Button>
      </header>

      <div className="container flex items-center justify-center flex-1 py-10 relative z-10">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Join GreekOne</h1>
            <p className="text-slate-300 text-lg">
              Start your chapter's digital transformation or join an existing organization
            </p>
          </div>

          <div className="glass-card rounded-3xl p-8">
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2 glass-card-inner bg-black/20 border-white/10 rounded-2xl p-1">
                <TabsTrigger
                  value="create"
                  className="rounded-xl data-[state=active]:bg-red-700/90 data-[state=active]:text-white text-slate-300"
                >
                  Create Organization
                </TabsTrigger>
                <TabsTrigger
                  value="join"
                  className="rounded-xl data-[state=active]:bg-red-700/90 data-[state=active]:text-white text-slate-300"
                >
                  Join Organization
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="mt-6">
                <Card className="glass-card-inner bg-black/10 border-white/10 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-white">Create a New Organization</CardTitle>
                    <CardDescription className="text-slate-300">
                      Set up your fraternity or sorority on our platform. You'll be the Group Owner.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleCreateOrganization}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-type" className="text-white">
                          Organization Type
                        </Label>
                        <RadioGroup
                          id="org-type"
                          value={orgType}
                          onValueChange={setOrgType}
                          className="flex space-x-4"
                          defaultValue="fraternity"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value="fraternity"
                              id="fraternity"
                              className="border-white/20 text-red-600"
                            />
                            <Label htmlFor="fraternity" className="text-slate-300">
                              Fraternity
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sorority" id="sorority" className="border-white/20 text-red-600" />
                            <Label htmlFor="sorority" className="text-slate-300">
                              Sorority
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="org-name" className="text-white">
                            Organization Name
                          </Label>
                          <Input
                            id="org-name"
                            placeholder="Alpha Beta Gamma"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="university" className="text-white">
                            University
                          </Label>
                          <Input
                            id="university"
                            placeholder="University of Example"
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="chapter" className="text-white">
                            Chapter Designation
                          </Label>
                          <Input
                            id="chapter"
                            placeholder="Alpha Chapter"
                            value={chapterDesignation}
                            onChange={(e) => setChapterDesignation(e.target.value)}
                            className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                            required
                          />
                        </div>

                        {!isColony && (
                          <div className="space-y-2">
                            <Label htmlFor="founded" className="text-white">
                              Founded Year
                            </Label>
                            <Input
                              id="founded"
                              placeholder="2023"
                              value={foundedYear}
                              onChange={(e) => setFoundedYear(e.target.value)}
                              className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                              required
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="colony"
                          checked={isColony}
                          onChange={(e) => setIsColony(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-red-600 focus:ring-red-500/20"
                        />
                        <Label htmlFor="colony" className="text-slate-300">
                          This is a colony/provisional chapter
                        </Label>
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <h3 className="text-lg font-medium text-white mb-2">Your Information</h3>
                        <p className="text-sm text-slate-400 mb-4">You'll be set as the Group Owner.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name" className="text-white">
                              Your Name
                            </Label>
                            <Input
                              id="name"
                              placeholder="John Doe"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email" className="text-white">
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="john@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone" className="text-white">
                              Phone Number
                            </Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="(555) 123-4567"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="major" className="text-white">
                              Major
                            </Label>
                            <Input
                              id="major"
                              placeholder="Computer Science"
                              value={major}
                              onChange={(e) => setMajor(e.target.value)}
                              className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2 mt-4">
                          <Label htmlFor="password" className="text-white">
                            Password
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="Create a secure password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-4">
                        <input
                          type="checkbox"
                          id="agree-terms"
                          checked={agreeToTerms}
                          onChange={(e) => setAgreeToTerms(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-red-600 focus:ring-red-500/20"
                          required
                        />
                        <Label htmlFor="agree-terms" className="text-slate-300 text-sm">
                          I have read and I agree to the{" "}
                          <Link href="/terms" className="text-red-400 hover:text-red-300 underline">
                            Terms & Conditions
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-red-400 hover:text-red-300 underline">
                            Privacy Policy
                          </Link>
                        </Label>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="submit"
                        className="w-full glass-card-solid bg-red-700/90 hover:bg-red-600 text-white py-6 rounded-xl font-semibold"
                        disabled={loading}
                      >
                        {loading ? "Creating..." : "Create Organization"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>

              <TabsContent value="join" className="mt-6">
                <Card className="glass-card-inner bg-black/10 border-white/10 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-white">Join an Organization</CardTitle>
                    <CardDescription className="text-slate-300">
                      Enter your organization's Group ID to join. Your request will need approval.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleJoinOrganization}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="group-id" className="text-white">
                          Group ID
                        </Label>
                        <Input
                          id="group-id"
                          placeholder="ABCD1234"
                          value={joinGroupId}
                          onChange={(e) => setJoinGroupId(e.target.value.toUpperCase())}
                          className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                          required
                        />
                        <p className="text-xs text-slate-400">
                          Ask your chapter Group Owner or administrator for this 8-character code.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="join-name" className="text-white">
                            Your Name
                          </Label>
                          <Input
                            id="join-name"
                            placeholder="John Doe"
                            value={joinName}
                            onChange={(e) => setJoinName(e.target.value)}
                            className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="join-email" className="text-white">
                            Email Address
                          </Label>
                          <Input
                            id="join-email"
                            type="email"
                            placeholder="john@example.com"
                            value={joinEmail}
                            onChange={(e) => setJoinEmail(e.target.value)}
                            className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="join-phone" className="text-white">
                            Phone Number
                          </Label>
                          <Input
                            id="join-phone"
                            type="tel"
                            placeholder="(555) 123-4567"
                            value={joinPhoneNumber}
                            onChange={(e) => setJoinPhoneNumber(e.target.value)}
                            className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="join-major" className="text-white">
                            Major
                          </Label>
                          <Input
                            id="join-major"
                            placeholder="Computer Science"
                            value={joinMajor}
                            onChange={(e) => setJoinMajor(e.target.value)}
                            className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="join-password" className="text-white">
                          Password
                        </Label>
                        <Input
                          id="join-password"
                          type="password"
                          placeholder="Create a secure password"
                          value={joinPassword}
                          onChange={(e) => setJoinPassword(e.target.value)}
                          className="glass-card-inner bg-white/5 border-white/10 text-white placeholder:text-slate-400 focus:border-red-500/50 focus:ring-red-500/20"
                          required
                        />
                      </div>

                      <div className="flex items-center space-x-2 pt-4">
                        <input
                          type="checkbox"
                          id="join-agree-terms"
                          checked={joinAgreeToTerms}
                          onChange={(e) => setJoinAgreeToTerms(e.target.checked)}
                          className="rounded border-white/20 bg-white/5 text-red-600 focus:ring-red-500/20"
                          required
                        />
                        <Label htmlFor="join-agree-terms" className="text-slate-300 text-sm">
                          I have read and I agree to the{" "}
                          <Link href="/terms" className="text-red-400 hover:text-red-300 underline">
                            Terms & Conditions
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-red-400 hover:text-red-300 underline">
                            Privacy Policy
                          </Link>
                        </Label>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="submit"
                        className="w-full glass-card-solid bg-red-700/90 hover:bg-red-600 text-white py-6 rounded-xl font-semibold"
                        disabled={joinLoading}
                      >
                        {joinLoading ? "Submitting..." : "Submit Join Request"}
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
            </Tabs>
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
