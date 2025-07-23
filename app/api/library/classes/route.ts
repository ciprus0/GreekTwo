import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)

// Function to normalize class names (remove spaces, convert to uppercase)
function normalizeClassName(className: string): string {
  return className.replace(/\s+/g, "").toUpperCase()
}

// Function to format class name for display (add space before numbers)
function formatClassName(normalizedName: string): string {
  // Add space before numbers: CS101 -> CS 101
  return normalizedName.replace(/([A-Z]+)(\d+)/, "$1 $2")
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get("organizationId")
    const search = searchParams.get("search") || ""

    if (!organizationId) {
      return NextResponse.json({ message: "Organization ID is required" }, { status: 400 })
    }

    // Get all unique class names for the organization
    const { data: classes, error } = await supabaseAdmin
      .from("library_files_new")
      .select("class_name")
      .eq("organization_id", organizationId)
      .eq("item_type", "class")
      .not("class_name", "is", null)

    if (error) {
      console.error("Error fetching classes:", error)
      return NextResponse.json({ message: "Error fetching classes" }, { status: 500 })
    }

    // Get unique normalized class names
    const uniqueClasses = new Set<string>()

    classes?.forEach((item) => {
      if (item.class_name) {
        // The class_name is already normalized in the database
        uniqueClasses.add(item.class_name)
      }
    })

    // Convert to array and format for display
    let formattedClasses = Array.from(uniqueClasses).map((normalizedName) => formatClassName(normalizedName))

    // Filter by search term if provided
    if (search) {
      const normalizedSearch = normalizeClassName(search)
      formattedClasses = formattedClasses.filter((className) =>
        normalizeClassName(className).includes(normalizedSearch),
      )
    }

    // Sort alphabetically
    formattedClasses.sort()

    return NextResponse.json({ classes: formattedClasses })
  } catch (error: any) {
    console.error("Server error:", error)
    return NextResponse.json({ message: error.message || "An unexpected error occurred" }, { status: 500 })
  }
}
