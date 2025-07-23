"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export default function LibraryPathTestPage() {
  const [url, setUrl] = useState("")
  const [result, setResult] = useState<any>(null)

  // Test URL extraction logic locally
  const testPathExtraction = () => {
    if (!url) return

    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split("/").filter((part) => part !== "")

      // Look for library-uploads bucket
      const bucketIndex = pathParts.findIndex((part) => part === "library-uploads")

      let extractedPath = ""
      if (bucketIndex !== -1) {
        extractedPath = pathParts.slice(bucketIndex + 1).join("/")
      }

      const pathSegments = extractedPath.split("/")

      setResult({
        originalUrl: url,
        pathname: urlObj.pathname,
        pathParts: pathParts,
        bucketIndex: bucketIndex,
        extractedPath: extractedPath,
        pathSegments: pathSegments,
        structure: {
          organizationId: pathSegments[0] || "Not found",
          userId: pathSegments[1] || "Not found",
          filename: pathSegments[2] || "Not found",
          additionalSegments: pathSegments.slice(3),
        },
      })
    } catch (error: any) {
      setResult({
        error: error.message,
      })
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">🔍 Library Path Extraction Test</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Library File Path Extraction</CardTitle>
          <CardDescription>Test how the system extracts the file path from library-uploads URLs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Library File URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a library file URL here"
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={testPathExtraction} disabled={!url}>
              Extract Path
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Path Extraction Result</CardTitle>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <div className="bg-red-50 border border-red-200 p-3 rounded">
                <p className="text-red-700">Error: {result.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Original URL</h4>
                  <code className="bg-gray-100 p-2 rounded block text-sm break-all">{result.originalUrl}</code>
                </div>

                <div>
                  <h4 className="font-medium mb-2">URL Pathname</h4>
                  <code className="bg-gray-100 p-2 rounded block text-sm">{result.pathname}</code>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Path Parts</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.pathParts.map((part: string, index: number) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded text-sm ${
                          part === "library-uploads" ? "bg-blue-100 border border-blue-300" : "bg-gray-100"
                        }`}
                      >
                        [{index}] {part}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Extracted File Path</h4>
                  <code className="bg-green-100 p-2 rounded block text-sm">
                    {result.extractedPath || "No path extracted"}
                  </code>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Path Structure Analysis</h4>
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <strong>Organization ID:</strong> <code>{result.structure.organizationId}</code>
                      </div>
                      <div>
                        <strong>User ID:</strong> <code>{result.structure.userId}</code>
                      </div>
                      <div>
                        <strong>Filename:</strong> <code>{result.structure.filename}</code>
                      </div>
                      {result.structure.additionalSegments.length > 0 && (
                        <div>
                          <strong>Additional Segments:</strong>{" "}
                          <code>{result.structure.additionalSegments.join("/")}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Expected Storage Path</h4>
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                    <p className="text-sm">For Supabase storage deletion, this path will be used:</p>
                    <code className="block mt-2 font-mono text-sm bg-white p-2 rounded border">
                      {result.extractedPath}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
