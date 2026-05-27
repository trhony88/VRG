'use client'

import { useEffect, useRef } from 'react'

interface ParticlesProps {
  count?: number
}

interface ParticleData {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  opacity: number
  hue: number
}

function createParticle(canvas: HTMLCanvasElement, init: boolean): ParticleData {
  return {
    x: Math.random() * canvas.width,
    y: init ? Math.random() * canvas.height : canvas.height + 10,
    size: Math.random() * 2 + 0.5,
    speedY: Math.random() * 0.6 + 0.2,
    speedX: (Math.random() - 0.5) * 0.3,
    opacity: Math.random() * 0.5 + 0.1,
    hue: Math.random() > 0.6 ? 43 : 270,
  }
}

function resetParticle(p: ParticleData, canvas: HTMLCanvasElement) {
  p.x = Math.random() * canvas.width
  p.y = canvas.height + 10
  p.size = Math.random() * 2 + 0.5
  p.speedY = Math.random() * 0.6 + 0.2
  p.speedX = (Math.random() - 0.5) * 0.3
  p.opacity = Math.random() * 0.5 + 0.1
  p.hue = Math.random() > 0.6 ? 43 : 270
}

export default function Particles({ count = 50 }: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    let particles: ParticleData[] = []

    const resize = () => {
      canvas!.width = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < count; i++) particles.push(createParticle(canvas, true))

    const loop = () => {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      particles.forEach(p => {
        p.y -= p.speedY
        p.x += p.speedX
        if (p.y < -10) resetParticle(p, canvas!)
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.opacity})`
        ctx!.fill()
      })
      animId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [count])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  )
}
