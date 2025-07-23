"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cacheManager } from "@/lib/cache-manager"
import { Trash2, RefreshCw, X } from "lucide-react"

export function CacheMonitor() {
  const [stats, setStats] = useState(cacheManager.getStats())
  const [isVisible, setIsVisible] = useState(false)
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    // Only show in development
    setIsVisible(process.env.NODE_ENV === "development")

    const interval = setInterval(() => {
      setStats(cacheManager.getStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!isVisible || !isOpen) return null

  const handleClearCache = () => {
    cacheManager.clear()
    setStats(cacheManager.getStats())
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Cache Monitor
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setStats(cacheManager.getStats())}>
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClearCache}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription className="text-xs">Production-level caching system</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Hit Rate:</span>
            <Badge
              variant={stats.hitRate > 80 ? "default" : stats.hitRate > 60 ? "secondary" : "destructive"}
              className="ml-1 text-xs"
            >
              {stats.hitRate.toFixed(1)}%
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Size:</span>
            <Badge variant="outline" className="ml-1 text-xs">
              {stats.size} items
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Hits:</span>
            <Badge variant="secondary" className="ml-1 text-xs">
              {stats.hits}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Misses:</span>
            <Badge variant="outline" className="ml-1 text-xs">
              {stats.misses}
            </Badge>
          </div>
        </div>

        <div className="text-xs">
          <span className="text-muted-foreground">Memory Usage:</span>
          <div className="mt-1 bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-300"
              style={{ width: `${Math.min((stats.memoryUsage / 1024 / 1024) * 10, 100)}%` }}
            />
          </div>
          <span className="text-muted-foreground text-xs">~{(stats.memoryUsage / 1024 / 1024).toFixed(2)} MB</span>
        </div>

        <div className="text-xs space-y-1">
          <div className="text-muted-foreground">Recent Activity:</div>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {stats.recentKeys.slice(0, 3).map((key, index) => (
              <div key={index} className="text-xs font-mono bg-muted/50 px-1 py-0.5 rounded truncate">
                {key}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
