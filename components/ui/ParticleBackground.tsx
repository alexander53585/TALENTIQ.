'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#3366FF', '#14B8A6', '#FFB84D', '#7C3AED', '#FF4C8B']

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const mouse = { x: undefined as number | undefined, y: undefined as number | undefined, radius: 150 }

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()

    type Particle = {
      x: number; y: number; directionX: number; directionY: number
      size: number; color: string
      draw(): void; update(): void
    }

    let particles: Particle[] = []

    const createParticle = (x: number, y: number, dx: number, dy: number, size: number, color: string): Particle => ({
      x, y, directionX: dx, directionY: dy, size, color,
      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = this.color
        ctx.fill()
      },
      update() {
        if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX
        if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY
        const dx = (mouse.x ?? -9999) - this.x
        const dy = (mouse.y ?? -9999) - this.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < mouse.radius && mouse.x !== undefined) {
          const fx = dx / dist, fy = dy / dist, f = (mouse.radius - dist) / mouse.radius
          this.x -= fx * f * 5
          this.y -= fy * f * 5
        } else {
          this.x += this.directionX
          this.y += this.directionY
        }
        this.draw()
      },
    })

    const init = () => {
      particles = []
      let n = Math.min((canvas.width * canvas.height) / 9000, 200)
      for (let i = 0; i < n; i++) {
        const size = Math.random() * 2 + 1
        particles.push(createParticle(
          Math.random() * (canvas.width - size * 4) + size * 2,
          Math.random() * (canvas.height - size * 4) + size * 2,
          Math.random() * 2 - 1, Math.random() * 2 - 1,
          size, COLORS[Math.floor(Math.random() * COLORS.length)]
        ))
      }
    }

    const connect = () => {
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dist = (particles[a].x - particles[b].x) ** 2 + (particles[a].y - particles[b].y) ** 2
          const threshold = (canvas.width / 14) * (canvas.height / 14)
          if (dist < threshold) {
            const opacity = Math.max(0, (1 - dist / 20000) * 0.4)
            if (opacity > 0.05) {
              ctx.globalAlpha = opacity
              ctx.lineWidth = 1
              ctx.strokeStyle = particles[a].color
              ctx.beginPath()
              ctx.moveTo(particles[a].x, particles[a].y)
              ctx.lineTo(particles[b].x, particles[b].y)
              ctx.stroke()
            }
          }
        }
      }
      ctx.globalAlpha = 1
    }

    let animId: number
    const animate = () => {
      animId = requestAnimationFrame(animate)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => p.update())
      connect()
    }

    const onMove = (e: MouseEvent) => { mouse.x = e.x; mouse.y = e.y }
    const onLeave = () => { mouse.x = undefined; mouse.y = undefined }
    const onResize = () => { resize(); init() }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', onResize)

    init()
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas ref={canvasRef} style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      zIndex: 0, pointerEvents: 'none', opacity: 0.5,
    }} />
  )
}
