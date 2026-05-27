'use client'

import { useEffect, useRef, useState } from 'react'

export default function useAnimatedCounter(target: number, duration: number = 1800, inView: boolean = false): number {
  const [value, setValue] = useState(0)
  const initRef = useRef(false)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!inView) return
    if (typeof target !== 'number') return

    startRef.current = performance.now()
    const animate = (now: number) => {
      const elapsed = now - (startRef.current || 0)
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [inView, target, duration])

  return value
}
