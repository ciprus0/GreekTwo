import NextAuth, { type User as NextAuthUser, type Account, type Profile } from "next-auth"
import type { JWT } from "next-auth/jwt"
import GoogleProvider from "next-auth/providers/google"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"

interface AppUser extends NextAuthUser {
  id: string
  organization_id?: string | null
  organizationId?: string | null
  role?: string | null
  approved?: boolean | null
}

interface AppSession {
  user?: AppUser
  accessToken?: string
}

interface AppToken extends JWT {
  id?: string
  organization_id?: string | null
  role?: string | null
  approved?: boolean | null
  accessToken?: string
  error?: string // To propagate errors if needed
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: NextAuthUser; account: Account | null; profile?: Profile }) {
      console.log("NextAuth signIn callback: Triggered for user:", profile?.email)
      if (!profile?.email) {
        console.error("NextAuth signIn: No email in profile. Denying sign-in.")
        return false
      }

      try {
        const supabase = getSupabaseAdminClient()
        const { data: member, error } = await supabase
          .from("members")
          .select("id, approved") // Only select what's needed for signIn decision
          .eq("email", profile.email)
          .single()

        if (error && error.code !== "PGRST116") {
          console.error("NextAuth signIn: Supabase error fetching member:", error.message, "Code:", error.code)
          return false // Deny sign-in on unexpected DB error
        }

        if (!member) {
          console.log(
            `NextAuth signIn: User ${profile.email} not found in members table. Allowing sign-in for now (can complete registration later).`,
          )
          // If user must exist, return false or redirect: return '/path/to/register-prompt';
          return true
        }

        // Optional: Check if member is approved, if that's a requirement for signing in at all
        // if (!member.approved) {
        //   console.log(`NextAuth signIn: User ${profile.email} is not approved. Denying sign-in.`);
        //   return '/path/to/approval-pending'; // Or return false
        // }

        console.log("NextAuth signIn: User", profile.email, "exists in members table. Allowing sign-in.")
        return true
      } catch (e: any) {
        console.error("NextAuth signIn: Exception during Supabase call:", e.message, e)
        return false // Deny sign-in on exception
      }
    },

    async jwt({
      token,
      user,
      account,
      profile,
    }: { token: JWT; user?: NextAuthUser; account?: Account | null; profile?: Profile }): Promise<JWT> {
      const appToken = token as AppToken
      console.log(
        "NextAuth jwt callback: Triggered. Current token email:",
        appToken.email,
        "Profile email:",
        profile?.email,
      )

      if (account && user && profile?.email) {
        // This block runs on initial sign-in
        console.log("NextAuth jwt: Initial sign-in for", profile.email)
        appToken.accessToken = account.access_token

        try {
          const supabase = getSupabaseAdminClient()
          const { data: member, error: memberError } = await supabase
            .from("members")
            .select("id, organization_id, role, approved")
            .eq("email", profile.email)
            .single()

          if (memberError && memberError.code !== "PGRST116") {
            console.error(
              "NextAuth jwt: Supabase error fetching member details for",
              profile.email,
              ":",
              memberError.message,
            )
            appToken.error = "FailedToLoadMemberData" // Propagate error if needed
          } else if (member) {
            appToken.id = member.id
            appToken.organization_id = member.organization_id
            appToken.role = member.role
            appToken.approved = member.approved
            // Standard JWT claims from profile if not already on token by default
            if (!appToken.name && profile.name) appToken.name = profile.name
            if (!appToken.email && profile.email) appToken.email = profile.email // Should be there
            if (!appToken.picture && (profile as any).picture) appToken.picture = (profile as any).picture

            console.log("NextAuth jwt: Populated token with member details for", profile.email, {
              id: member.id,
              orgId: member.organization_id,
              role: member.role,
              approved: member.approved,
            })
          } else {
            console.log(
              "NextAuth jwt: Member not found for",
              profile.email,
              "during token population. Token will lack custom details.",
            )
          }
        } catch (e: any) {
          console.error("NextAuth jwt: Exception during Supabase call for", profile.email, ":", e.message, e)
          appToken.error = "ExceptionLoadingMemberData"
        }
      }
      // On subsequent JWT calls, appToken.id etc. should already be set if populated initially.
      return appToken
    },

    async session({ session, token }: { session: AppSession; token: JWT }): Promise<AppSession> {
      const appToken = token as AppToken
      console.log("NextAuth session callback: Triggered for token id:", appToken.id)

      // Transfer properties from token to session.user
      const newSessionUser: AppUser = {
        name: appToken.name,
        email: appToken.email,
        image: appToken.picture,
        id: appToken.id || "", // Ensure id is a string; handle if missing
        organization_id: appToken.organization_id,
        organizationId: appToken.organization_id,
        role: appToken.role,
        approved: appToken.approved,
      }
      session.user = newSessionUser
      session.accessToken = appToken.accessToken

      if (appToken.error) {
        // (session as any).error = appToken.error; // Optionally pass error to session
        console.warn("NextAuth session: Token had an error:", appToken.error)
      }

      console.log("NextAuth session: Populated session.user for", newSessionUser.email, "with id:", newSessionUser.id)
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development", // Enable debug logs from NextAuth
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
