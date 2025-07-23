"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect, useMemo } from "react"

// Performance utilities for optimizing the app

// Debounce hook for reducing API calls
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Throttle hook for limiting function calls
export function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  const lastCall = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback(
    (...args: any[]) => {
      const now = Date.now()

      if (now - lastCall.current >= delay) {
        lastCall.current = now
        return callback(...args)
      } else {
        // Clear existing timeout and set a new one
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(
          () => {
            lastCall.current = Date.now()
            callback(...args)
          },
          delay - (now - lastCall.current),
        )
      }
    },
    [callback, delay],
  ) as T
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(elementRef: React.RefObject<Element>, options: IntersectionObserverInit = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true)
        }
      },
      {
        rootMargin: "50px",
        threshold: 0.1,
        ...options,
      },
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [elementRef, options, hasIntersected])

  return { isIntersecting, hasIntersected }
}

// Memory cleanup utility
export function useCleanup(cleanup: () => void) {
  const cleanupRef = useRef(cleanup)
  cleanupRef.current = cleanup

  useEffect(() => {
    return () => {
      cleanupRef.current()
    }
  }, [])
}

// Memoized API call hook with better caching
export function useMemoizedApiCall<T>(
  apiCall: () => Promise<T>,
  dependencies: any[],
  cacheTime: number = 5 * 60 * 1000, // 5 minutes
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null)
  const requestRef = useRef<Promise<T> | null>(null)

  const memoizedCall = useCallback(async () => {
    // Check cache first
    if (cacheRef.current && Date.now() - cacheRef.current.timestamp < cacheTime) {
      setData(cacheRef.current.data)
      return cacheRef.current.data
    }

    // Prevent duplicate requests
    if (requestRef.current) {
      return requestRef.current
    }

    setLoading(true)
    setError(null)

    try {
      requestRef.current = apiCall()
      const result = await requestRef.current

      cacheRef.current = { data: result, timestamp: Date.now() }
      setData(result)
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
      requestRef.current = null
    }
  }, dependencies)

  return { data, loading, error, refetch: memoizedCall }
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>(items: T[], itemHeight: number, containerHeight: number, overscan = 5) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const end = Math.min(items.length, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)
    return { start, end }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      offsetY: (visibleRange.start + index) * itemHeight,
    }))
  }, [items, visibleRange, itemHeight])

  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    visibleRange,
  }
}

// Optimized state updater to prevent unnecessary re-renders
export function useOptimizedState<T>(initialState: T) {
  const [state, setState] = useState(initialState)
  const stateRef = useRef(state)

  const optimizedSetState = useCallback((newState: T | ((prev: T) => T)) => {
    const nextState = typeof newState === "function" ? (newState as (prev: T) => T)(stateRef.current) : newState

    // Only update if the state actually changed
    if (JSON.stringify(nextState) !== JSON.stringify(stateRef.current)) {
      stateRef.current = nextState
      setState(nextState)
    }
  }, [])

  useEffect(() => {
    stateRef.current = state
  }, [state])

  return [state, optimizedSetState] as const
}

// Batch updates to prevent multiple re-renders
export function useBatchedUpdates() {
  const [, forceUpdate] = useState({})
  const updatesRef = useRef<(() => void)[]>([])
  const timeoutRef = useRef<NodeJS.Timeout>()

  const batchUpdate = useCallback((updateFn: () => void) => {
    updatesRef.current.push(updateFn)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      const updates = updatesRef.current
      updatesRef.current = []

      updates.forEach((update) => update())
      forceUpdate({})
    }, 0)
  }, [])

  return batchUpdate
}
