"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useSearchParams } from "next/navigation"

export default function StorageDeleteTestPage() {
  const [url, setUrl] = useState("")
  const [bucketName, setBucketName] = useState("library-uploads")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // Auto-populate from URL parameters
  useEffect(() => {
    const urlParam = searchParams.get("url")
    const bucketParam = searchParams.get("bucket")

    if (urlParam) {
      setUrl(urlParam)
    }
    if (bucketParam) {
      setBucketName(bucketParam)
    }
  }, [searchParams])

  const handleTest = async () => {
    if (!url || !bucketName) return

    setLoading(true)
    setError(null)

    try {
      console.log("🧪 Testing storage delete with:", { url, bucketName })

      const response = await fetch("/api/storage/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, bucketName }),
      })

      const data = await response.json()
      console.log("📡 Response:", data)

      setResult({ response: data, status: response.status, ok: response.ok })

      if (!response.ok) {
        setError(data.message || "Failed to delete file")
      }
    } catch (err: any) {
      console.error("❌ Error:", err)
      setError(err.message || "An error occurred")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">🧪 Storage Delete API Tester</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Storage Delete API</CardTitle>
          <CardDescription>Use this form to test the storage delete API directly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">File URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter the file URL"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bucketName">Bucket Name</Label>
              <Input
                id="bucketName"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="Enter the bucket name"
              />
            </div>

            {url && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-800 mb-2">Preview</h4>
                <div className="text-sm space-y-1">
                  <div>
                    <strong>URL:</strong> <span className="break-all">{url}</span>
                  </div>
                  <div>
                    <strong>Bucket:</strong> <code>{bucketName}</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleTest} disabled={loading || !url || !bucketName} className="w-full">
            {loading ? "🔄 Testing Delete..." : "🧪 Test Delete API"}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-red-600">❌ Error</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 p-3 rounded">
              <p className="text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className={result.ok ? "text-green-600" : "text-red-600"}>
              {result.ok ? "✅ Success" : "❌ Failed"} - Status: {result.status}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">API Response</h4>
                <pre className="bg-gray-100 p-3 rounded overflow-auto text-sm max-h-96">
                  {JSON.stringify(result.response, null, 2)}
                </pre>
              </div>

              {result.response.deletedPath && (
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <h4 className="font-medium text-green-800 mb-1">File Path Extracted</h4>
                  <code className="text-sm">{result.response.deletedPath}</code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p>Testing storage delete API...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
