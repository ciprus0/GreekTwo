"use client"

import { useSession, type SessionContextValue } from "next-auth/react"
import type { User as NextAuthUser } from "next-auth" // Default NextAuth User type

// Define a more specific user type if you have custom properties in your session user object
export interface AppUser extends NextAuthUser {
  id?: string
  organization_id?: string
  organizationId?: string // Allow for both snake_case and camelCase
  role?: string
  // Add any other custom properties your user object might have
}

interface UseUserReturn {
  user: AppUser | undefined | null
  status: SessionContextValue["status"]
  session: SessionContextValue["data"]
}

/**
 * Custom hook to access the current user's session data.
 * Leverages `useSession` from `next-auth/react`.
 */
export function useUser(): UseUserReturn {
  const { data: session, status } = useSession() // This is NextAuth's useSession
  const user = session?.user as AppUser | undefined
  return { user, status, session }
}
