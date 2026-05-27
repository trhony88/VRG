'use client'

import { useState, useEffect } from 'react'

export function useSettings(): Record<string, any> {
  const [settings, setSettings] = useState<Record<string, any>>({})

  useEffect(() => {
    fetch('/api/settings')
      .then(r => {
        if (!r.ok) return {}
        return r.json()
      })
      .then((data: Record<string, any>) => {
        if (data && !data.error && typeof data === 'object' && !Array.isArray(data)) {
          setSettings(data)
        }
      })
      .catch(() => {
        // Silently fail - defaults will be used
      })
  }, [])

  return settings
}
