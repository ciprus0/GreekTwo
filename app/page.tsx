"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Menu,
  X,
  Users,
  BookOpen,
  MessageSquare,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if user has "remember me" enabled and is still valid
    const checkRememberedLogin = () => {
      const isAuthenticated = localStorage.getItem("isAuthenticated")
      const rememberMe = localStorage.getItem("rememberMe")
      const rememberExpiry = localStorage.getItem("rememberExpiry")

      if (isAuthenticated === "true" && rememberMe === "true" && rememberExpiry) {
        const expiryDate = new Date(rememberExpiry)
        const now = new Date()

        if (now < expiryDate) {
          // Still within remember me period, redirect to dashboard
          router.push("/dashboard")
          return
        } else {
          // Remember me expired, clear it
          localStorage.removeItem("rememberMe")
          localStorage.removeItem("rememberExpiry")
        }
      }
    }

    checkRememberedLogin()
  }, [])

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black"></div>
        <div className="absolute inset-0 opacity-30 bg-gradient-radial from-red-500/30 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fillRule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fillOpacity=&quot;0.02&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;1&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      </div>

      <header className="relative z-50 container mx-auto py-6 px-4 md:px-6 flex items-center justify-between">
        <div className="glass-card px-4 py-2 rounded-full">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="GreekOne Logo" width={40} height={40} className="h-8 w-auto" />
            <span className="ml-2 text-white font-bold text-xl">GreekOne</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <div className="glass-card px-6 py-3 rounded-full flex items-center gap-6">
            <Link href="/" className="text-white font-medium hover:text-red-300 transition-colors">
              Home
            </Link>
            <Link href="/register" className="text-white font-medium hover:text-red-300 transition-colors">
              Register
            </Link>
          </div>
          <Button
            asChild
            className="glass-card-solid bg-red-700/90 hover:bg-red-600 text-white rounded-full px-6 ml-4 backdrop-blur-sm"
          >
            <Link href="/login">Login</Link>
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="outline"
          size="icon"
          className="md:hidden glass-card border-white/20 text-white hover:bg-white/10 rounded-full"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="sr-only">Toggle menu</span>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="absolute top-full left-4 right-4 glass-card rounded-2xl p-6 md:hidden z-50 mt-4">
            <div className="space-y-4">
              <Link
                href="/"
                className="block text-white font-medium hover:text-red-300 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/register"
                className="block text-white font-medium hover:text-red-300 transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
              <Button
                asChild
                className="glass-card-solid bg-red-700/90 hover:bg-red-600 text-white rounded-full w-full"
              >
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  Login
                </Link>
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 relative z-10">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center space-y-8 max-w-4xl mx-auto">
              <div className="space-y-4">
                <p className="text-red-400 font-medium text-sm md:text-base tracking-wider uppercase">
                  Excellence • Unity • Leadership
                </p>
                <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                  Elevate Your
                  <br />
                  <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                    Greek Life
                  </span>
                </h1>
                <p className="text-slate-300 text-xl max-w-2xl mx-auto leading-relaxed">
                  Unite your chapter with powerful tools designed for the modern Greek organization. Track progress,
                  build connections, and create lasting memories.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  asChild
                  className="glass-card-solid bg-red-700/90 hover:bg-red-600 text-white rounded-full px-8 py-6 text-lg font-semibold"
                >
                  <Link href="/register" className="inline-flex items-center gap-2">
                    Get Started
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="glass-card border-white/20 text-white hover:bg-white/10 rounded-full px-8 py-6 text-lg"
                >
                  <Link href="#features">Explore Features</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Preview Section */}
        <section id="features" className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Built for Greek Excellence</h2>
              <p className="text-slate-300 max-w-3xl mx-auto text-lg">
                Every feature crafted with your chapter's success in mind. From tracking achievements to fostering
                connections, GreekOne empowers your organization to thrive.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
              {/* Study Hours Feature */}
              <div>
                <div className="glass-card p-8 rounded-3xl h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mb-6">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Study Hour Tracking</h3>
                  <p className="text-slate-300 mb-6 leading-relaxed">
                    Monitor academic progress with intuitive tracking tools. Set goals, track achievements, and
                    celebrate academic excellence together.
                  </p>
                  <div className="glass-card-inner rounded-2xl p-4 mb-4">
                    <Image
                      src="/placeholder.svg?height=200&width=300&text=Study+Hours+Interface"
                      alt="Study Hours Interface"
                      width={300}
                      height={200}
                      className="w-full h-auto rounded-xl"
                    />
                  </div>
                  <div className="flex items-center text-red-400 font-medium">
                    <span>Track Progress</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </div>
                </div>
              </div>

              {/* Messages Feature */}
              <div>
                <div className="glass-card p-8 rounded-3xl h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mb-6">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Chapter Communication</h3>
                  <p className="text-slate-300 mb-6 leading-relaxed">
                    Stay connected with seamless messaging. Share updates, coordinate events, and strengthen chapter
                    bonds through meaningful conversations.
                  </p>
                  <div className="glass-card-inner rounded-2xl p-4 mb-4">
                    <Image
                      src="/placeholder.svg?height=200&width=300&text=Messages+Interface"
                      alt="Messages Interface"
                      width={300}
                      height={200}
                      className="w-full h-auto rounded-xl"
                    />
                  </div>
                  <div className="flex items-center text-red-400 font-medium">
                    <span>Connect Now</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </div>
                </div>
              </div>

              {/* Library Feature */}
              <div>
                <div className="glass-card p-8 rounded-3xl h-full">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mb-6">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Digital Library</h3>
                  <p className="text-slate-300 mb-6 leading-relaxed">
                    Organize and share resources effortlessly. From documents to memories, keep your chapter's knowledge
                    accessible and secure.
                  </p>
                  <div className="glass-card-inner rounded-2xl p-4 mb-4">
                    <Image
                      src="/placeholder.svg?height=200&width=300&text=Library+Interface"
                      alt="Library Interface"
                      width={300}
                      height={200}
                      className="w-full h-auto rounded-xl"
                    />
                  </div>
                  <div className="flex items-center text-red-400 font-medium">
                    <span>Explore Library</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="glass-card p-6 rounded-2xl text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Service Hours</h4>
                  <p className="text-slate-300 text-sm">Track community service and philanthropic activities</p>
                </div>
              </div>

              <div>
                <div className="glass-card p-6 rounded-2xl text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Event Planning</h4>
                  <p className="text-slate-300 text-sm">Organize memorable events and track attendance</p>
                </div>
              </div>

              <div>
                <div className="glass-card p-6 rounded-2xl text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Member Management</h4>
                  <p className="text-slate-300 text-sm">Manage member profiles and chapter roster</p>
                </div>
              </div>

              <div>
                <div className="glass-card p-6 rounded-2xl text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Task Management</h4>
                  <p className="text-slate-300 text-sm">Assign and track chapter responsibilities</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div>
              <div className="glass-card-solid bg-gradient-to-r from-red-700/90 to-red-800/90 rounded-3xl p-12 md:p-16 text-center backdrop-blur-sm">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Transform Your Chapter?</h2>
                <p className="text-red-100 max-w-2xl mx-auto mb-8 text-lg leading-relaxed">
                  Join the movement of Greek organizations embracing modern management. Your chapter's greatest
                  achievements start here.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    asChild
                    className="bg-white text-red-700 hover:bg-slate-100 rounded-full px-8 py-6 text-lg font-semibold"
                  >
                    <Link href="/register">Start Your Journey</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 bg-black/50 backdrop-blur-sm border-t border-white/10 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image src="/logo.svg" alt="GreekOne Logo" width={32} height={32} className="h-8 w-auto" />
                <span className="ml-2 text-white font-bold text-lg">GreekOne</span>
              </div>
              <p className="text-slate-400 text-sm">Empowering Greek life excellence since 2025.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="#features" className="text-slate-400 hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-slate-400 hover:text-white transition-colors">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="text-slate-400 hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-slate-400 hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 text-sm text-center">
            <p className="text-slate-400">© {new Date().getFullYear()} GreekOne. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .glass-card-solid {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.2);
        }
        
        .glass-card-inner {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  )
}
