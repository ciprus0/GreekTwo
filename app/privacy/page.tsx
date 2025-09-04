"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black"></div>
        <div className="absolute inset-0 opacity-30 bg-gradient-radial from-red-500/30 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fillRule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%23ffffff&quot; fillOpacity=&quot;0.02&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;1&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
      </div>

      <header className="relative z-50 container mx-auto py-6 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="outline"
            className="glass-card border-white/20 text-white hover:bg-white/10 rounded-full"
          >
            <Link href="/" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 relative z-10 container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-3xl p-8 md:p-12">
            <div className="prose prose-invert max-w-none">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">GreekOne Privacy Policy</h1>
              <p className="text-slate-300 text-lg mb-8">
                <strong>Effective Date: 9/4/2025 | Last Updated: 9/4/2025</strong>
              </p>

              <p className="text-slate-300 text-lg mb-8">
                GreekOne ("we," "our," or "us") values your privacy and is committed to protecting your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you use our services. By accessing or using GreekOne, you agree to the collection and use of your data as described in this policy.
              </p>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">1. Information We Collect</h2>
              <p className="text-slate-300 mb-4">
                We collect information to provide and improve our services, enhance user experience, and ensure platform security.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.1 Personal Information</h3>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• Name, email address, phone number (for account creation and verification)</li>
                <li>• University and Greek organization affiliation (to personalize your experience and facilitate group activities)</li>
                <li>• Profile picture and academic information (major, graduation year, bio)</li>
                <li>• Member roles and permissions within your organization</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.2 Location Data</h3>
              <p className="text-slate-300 mb-3">
                With your consent, we collect real-time location data to:
              </p>
              <ul className="text-slate-300 mb-4 space-y-2">
                <li>• Verify study and gym session attendance at designated locations</li>
                <li>• Enable GPS-based activity tracking for accurate hour logging</li>
                <li>• Provide location-based features for event attendance and house points activities</li>
                <li>• Improve study and fitness tracking insights for better member accountability</li>
              </ul>
              <p className="text-slate-300 mb-6">
                Location tracking can be adjusted in your device settings at any time.
              </p>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.3 Activity and Participation Data</h3>
              <p className="text-slate-300 mb-3">
                We collect data on your organizational participation, including:
              </p>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• Study session logs with timestamps and locations</li>
                <li>• Gym session tracking and duration</li>
                <li>• Service hours and chapter participation records</li>
                <li>• Event attendance and RSVP data</li>
                <li>• House points submissions and QR code scans</li>
                <li>• Election votes and poll responses (anonymized when applicable)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.4 Communication Data</h3>
              <p className="text-slate-300 mb-3">
                We collect and store:
              </p>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• Direct messages and group chat communications</li>
                <li>• Shared images and files within conversations</li>
                <li>• Message reactions and read receipts</li>
                <li>• Announcement interactions and notifications</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.5 Usage Data</h3>
              <p className="text-slate-300 mb-3">
                We collect data on how you interact with GreekOne, including:
              </p>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• Login history and session activity</li>
                <li>• Feature usage and navigation patterns</li>
                <li>• Event creation and management activities</li>
                <li>• Administrative actions (for authorized users)</li>
                <li>• Preferences and settings</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">1.6 Device and Technical Data</h3>
              <p className="text-slate-300 mb-3">
                When you access GreekOne, we may automatically collect:
              </p>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• IP address, browser type, operating system, and device information</li>
                <li>• App version and crash reports</li>
                <li>• Performance metrics and error logs</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">2. How We Use Your Information</h2>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• Provide and improve GreekOne's features and services</li>
                <li>• Facilitate communication within Greek organizations</li>
                <li>• Track and verify member participation and requirements</li>
                <li>• Personalize user experience and recommendations</li>
                <li>• Analyze user trends for platform improvements</li>
                <li>• Send updates, notifications, and important announcements</li>
                <li>• Enhance security and prevent fraud</li>
                <li>• Generate reports and analytics for organization administrators</li>
                <li>• Conduct elections and polls securely</li>
                <li>• Manage member roles and permissions</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">3. How We Share Your Information</h2>
              <p className="text-slate-300 mb-4">
                We do not sell personal data but may share information in the following cases:
              </p>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• With your Greek organization (limited profile information, participation data, and requirement progress)</li>
                <li>• With organization administrators (for member management and oversight purposes)</li>
                <li>• With third-party service providers under strict confidentiality agreements (email services, cloud storage, analytics)</li>
                <li>• Legal compliance or safety purposes</li>
                <li>• When required by law or to protect our rights and safety</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">4. Data Security</h2>
              <p className="text-slate-300 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• All data is encrypted in transit and at rest</li>
                <li>• Access controls and role-based permissions</li>
                <li>• Regular security audits and updates</li>
                <li>• Secure authentication and session management</li>
                <li>• Protected communication channels</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">5. Data Retention & Deletion</h2>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• We retain data as long as your account is active and your organization requires it</li>
                <li>• Study and gym session data is retained for requirement tracking purposes</li>
                <li>• Communication data is retained for conversation history</li>
                <li>• Upon account deletion, all associated personal data is permanently erased within 30 days</li>
                <li>• Some anonymized analytics data may be retained for platform improvement</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">6. Your Rights & Choices</h2>
              <ul className="text-slate-300 mb-6 space-y-2">
                <li>• You can update your profile details and preferences</li>
                <li>• Disable location tracking via device settings</li>
                <li>• Opt-out of promotional emails and notifications</li>
                <li>• Request access to your personal data</li>
                <li>• Request correction of inaccurate data</li>
                <li>• Request deletion of your account and associated data</li>
                <li>• Control your visibility and communication preferences</li>
              </ul>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">7. Children's Privacy</h2>
              <p className="text-slate-300 mb-6">
                GreekOne is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">8. Third-Party Links & Integrations</h2>
              <p className="text-slate-300 mb-6">
                GreekOne may contain links to third-party services and integrations. We encourage you to review their privacy policies as we are not responsible for their practices.
              </p>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">9. International Data Transfers</h2>
              <p className="text-slate-300 mb-6">
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
              </p>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">10. Changes to This Privacy Policy</h2>
              <p className="text-slate-300 mb-6">
                We may update this Privacy Policy periodically. Users will be notified of significant changes via email or in-app notifications. Continued use of the service after changes constitutes acceptance of the updated policy.
              </p>

              <h2 className="text-2xl font-bold text-white mt-8 mb-4">11. Contact Us</h2>
              <p className="text-slate-300 mb-4">
                For any questions or concerns about this Privacy Policy or our data practices, reach out to us at:
              </p>
              <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
                <p className="text-slate-300 mb-2">
                  <strong className="text-white">Email:</strong> wise.tim16@gmail.com
                </p>
                <p className="text-slate-300">
                  <strong className="text-white">Address:</strong> 611 Wilson Street, Downers Grove, IL
                </p>
              </div>

              <div className="border-t border-white/10 pt-6 mt-8">
                <p className="text-slate-400 text-sm italic">
                  This Privacy Policy is effective as of the date listed above and applies to all users of GreekOne.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  )
}
