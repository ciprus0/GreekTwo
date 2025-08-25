import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, Linkedin, Twitter } from "lucide-react"

export default function TeamPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-hidden">
      <header className="container mx-auto py-4 px-4 md:px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo.svg" alt="Greeky Logo" width={60} height={60} className="h-12 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-slate-900 font-medium hover:text-blue-600 transition-colors">
            Home
          </Link>
          <Link href="/register" className="text-slate-900 font-medium hover:text-blue-600 transition-colors">
            Register
          </Link>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-6">
            <Link href="/login">Login</Link>
          </Button>
        </nav>
        <Button variant="outline" size="icon" className="md:hidden">
          <span className="sr-only">Toggle menu</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </Button>
      </header>

      <main className="flex-1">
        <section className="bg-blue-50 py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Meet Our Team</h1>
            <p className="text-slate-600 max-w-2xl mx-auto mb-12">
              We're a team of Greek life alumni and students who understand the challenges of running a chapter. Our
              mission is to make Greek life management easier and more efficient.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src="/placeholder.svg?height=96&width=96" alt="Alex Johnson" />
                    <AvatarFallback>AJ</AvatarFallback>
                  </Avatar>
                  <CardTitle>Alex Johnson</CardTitle>
                  <CardDescription>Co-Founder & CEO</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Former chapter president with a passion for technology and Greek life. Alex founded Greeky to solve
                    the administrative challenges he faced as a leader.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Github className="h-5 w-5" />
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src="/placeholder.svg?height=96&width=96" alt="Sophia Martinez" />
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <CardTitle>Sophia Martinez</CardTitle>
                  <CardDescription>Co-Founder & COO</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    With experience as a sorority treasurer and event coordinator, Sophia brings operational expertise
                    and a user-centered approach to the Greeky platform.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Github className="h-5 w-5" />
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src="/placeholder.svg?height=96&width=96" alt="Marcus Chen" />
                    <AvatarFallback>MC</AvatarFallback>
                  </Avatar>
                  <CardTitle>Marcus Chen</CardTitle>
                  <CardDescription>CTO</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    A computer science graduate and fraternity member, Marcus leads our development team and ensures
                    Greeky stays on the cutting edge of technology.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Github className="h-5 w-5" />
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src="/placeholder.svg?height=96&width=96" alt="Taylor Williams" />
                    <AvatarFallback>TW</AvatarFallback>
                  </Avatar>
                  <CardTitle>Taylor Williams</CardTitle>
                  <CardDescription>Head of Design</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    Taylor combines her background in UX/UI design with her experience as a sorority member to create
                    intuitive and beautiful interfaces for Greeky.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Github className="h-5 w-5" />
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src="/placeholder.svg?height=96&width=96" alt="Jordan Smith" />
                    <AvatarFallback>JS</AvatarFallback>
                  </Avatar>
                  <CardTitle>Jordan Smith</CardTitle>
                  <CardDescription>Customer Success</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    As a former chapter secretary, Jordan understands the needs of our users and ensures every chapter
                    gets the most out of the Greeky platform.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Github className="h-5 w-5" />
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarImage src="/placeholder.svg?height=96&width=96" alt="Riley Thompson" />
                    <AvatarFallback>RT</AvatarFallback>
                  </Avatar>
                  <CardTitle>Riley Thompson</CardTitle>
                  <CardDescription>Marketing Director</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    With experience in both digital marketing and Greek life leadership, Riley helps spread the word
                    about Greeky to chapters across the country.
                  </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                  <Button variant="ghost" size="icon">
                    <Twitter className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Linkedin className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Github className="h-5 w-5" />
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Join Our Team</h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-8">
              We're always looking for talented individuals who are passionate about Greek life and technology. Check
              out our open positions and join us in our mission.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/careers">View Open Positions</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Image src="/logo-white.svg" alt="Greeky Logo" width={60} height={60} className="h-10 w-auto mb-4" />
              <p className="text-sm">Making Greek life management easier since 2023.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/features" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/testimonials" className="hover:text-white transition-colors">
                    Testimonials
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-white transition-colors">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="hover:text-white transition-colors">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-12 pt-8 text-sm text-center">
            <p>© {new Date().getFullYear()} Greeky. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
