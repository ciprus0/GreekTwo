"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useSearchParams } from "next/navigation"

export default function UrlTestPage() {
  const [url, setUrl] = useState("")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Auto-populate URL from search params and auto-analyze
  useEffect(() => {
    const urlParam = searchParams.get("url")
    if (urlParam) {
      setUrl(urlParam)
      // Auto-analyze the URL
      analyzeUrl(urlParam)
    }
  }, [searchParams])

  const analyzeUrl = async (urlToAnalyze: string) => {
    if (!urlToAnalyze) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/debug/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: urlToAnalyze }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to analyze URL")
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || "An error occurred")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleTest = () => analyzeUrl(url)

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">URL Structure Analyzer</h1>

      <div className="flex gap-4 mb-6">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter a URL to analyze"
          className="flex-1"
        />
        <Button onClick={handleTest} disabled={loading || !url}>
          {loading ? "Analyzing..." : "Analyze URL"}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>URL Analysis Result</CardTitle>
              <CardDescription className="break-all">{result.url}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">URL Components</h3>
                  <div className="bg-gray-100 p-3 rounded">
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <strong>Protocol:</strong> {result.components.protocol}
                      </div>
                      <div>
                        <strong>Hostname:</strong> {result.components.hostname}
                      </div>
                      <div>
                        <strong>Pathname:</strong> {result.components.pathname}
                      </div>
                      <div>
                        <strong>Search:</strong> {result.components.search || "None"}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Path Parts</h3>
                  <div className="bg-gray-100 p-3 rounded">
                    <div className="flex flex-wrap gap-2">
                      {result.components.pathParts.map((part: string, index: number) => (
                        <span key={index} className="bg-blue-100 px-2 py-1 rounded text-sm">
                          [{index}] {part || "<empty>"}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {result.storageInfo && (
                  <div>
                    <h3 className="font-medium mb-2 text-green-600">✅ Storage Information Detected</h3>
                    <div className="bg-green-50 border border-green-200 p-3 rounded">
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div>
                          <strong>Pattern:</strong> {result.storageInfo.pattern}
                        </div>
                        <div>
                          <strong>Bucket Name:</strong>{" "}
                          <code className="bg-gray-200 px-1 rounded">{result.storageInfo.bucketName}</code>
                        </div>
                        <div>
                          <strong>File Path:</strong>{" "}
                          <code className="bg-gray-200 px-1 rounded">{result.storageInfo.filePath}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!result.storageInfo && (
                  <div>
                    <h3 className="font-medium mb-2 text-red-600">❌ No Storage Pattern Detected</h3>
                    <div className="bg-red-50 border border-red-200 p-3 rounded text-sm">
                      This URL doesn't match the expected Supabase storage URL pattern.
                      <br />
                      Expected pattern: <code>/storage/v1/object/public/bucketName/path/to/file.ext</code>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="text-sm text-gray-500">Use this information to debug URL parsing issues</div>
            </CardFooter>
          </Card>

          {result.storageInfo && (
            <Card>
              <CardHeader>
                <CardTitle>🧪 Test Storage Deletion</CardTitle>
                <CardDescription>Based on the analyzed URL, test the storage delete API</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    const testUrl = `/debug/storage-delete-test?url=${encodeURIComponent(result.url)}&bucket=${encodeURIComponent(result.storageInfo.bucketName)}`
                    window.open(testUrl, "_blank")
                  }}
                  className="w-full"
                >
                  Test Delete API with This URL
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Analyzing URL...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
