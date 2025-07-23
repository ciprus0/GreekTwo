import { type NextRequest, NextResponse } from "next/server"
import { api } from "@/lib/supabase-api"

export async function POST(request: NextRequest) {
  try {
    const { theme } = await request.json()

    // Get user from session/auth - you'll need to implement your auth check here
    // For now, we'll get the user ID from the request headers or body
    const userId = request.headers.get("x-user-id") // You'll need to set this in your auth middleware

    if (!userId) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    // Update user's theme preference in the database
    await api.updateMember(userId, { theme_preference: theme })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating theme preference:", error)
    return NextResponse.json({ error: "Failed to update theme preference" }, { status: 500 })
  }
}
