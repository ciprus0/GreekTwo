import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ success: false, message: "URL is required" }, { status: 400 })
    }

    // Parse the URL
    const urlObj = new URL(url)

    // Extract components
    const components = {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      pathParts: urlObj.pathname.split("/"),
      search: urlObj.search,
      hash: urlObj.hash,
    }

    // Try to identify storage URL patterns
    let storageInfo = null

    // Pattern: https://xxx.supabase.co/storage/v1/object/public/bucketName/path/to/file.ext
    const publicMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/)
    if (publicMatch) {
      storageInfo = {
        pattern: "Supabase Storage Public URL",
        bucketName: publicMatch[1],
        filePath: publicMatch[2],
      }
    }

    return NextResponse.json({
      success: true,
      url,
      components,
      storageInfo,
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 })
  }
}
