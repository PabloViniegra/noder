import { useEffect, useRef } from "react"

type Vec3 = { x: number; y: number; z: number }
type Vec2 = { x: number; y: number; z: number }

const CAM = { x: 0, y: 1.62, z: -0.55 }
const FOCAL = 1.85
const HORIZON = 0.46
const LIGHT = normalize({ x: -0.35, y: 0.82, z: 0.42 })
const BANDS = [
  { z: 2.35, alpha: 0.2, width: 0.055 },
  { z: 3.9, alpha: 0.13, width: 0.042 },
  { z: 5.8, alpha: 0.08, width: 0.032 },
]
const SOLID_SCALE = 0.96
const SOLID_POS = { x: 0, y: 2.28, z: 3.35 }
const VERTS: Vec3[] = [
  { x: 0, y: 1, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 0, z: -1 },
  { x: 0, y: -1, z: 0 },
]
const FACES: Array<[number, number, number]> = [
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 4],
  [0, 4, 1],
  [5, 2, 1],
  [5, 3, 2],
  [5, 4, 3],
  [5, 1, 4],
]

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function rotate(v: Vec3, ax: number, ay: number): Vec3 {
  const cx = Math.cos(ax)
  const sx = Math.sin(ax)
  const cy = Math.cos(ay)
  const sy = Math.sin(ay)
  const y1 = v.y * cx - v.z * sx
  const z1 = v.y * sx + v.z * cx
  return { x: v.x * cy + z1 * sy, y: y1, z: -v.x * sy + z1 * cy }
}

function project(p: Vec3, w: number, h: number): Vec2 | null {
  const dz = p.z - CAM.z
  if (dz < 0.35) {
    return null
  }
  const f = (FOCAL / dz) * h * 0.52
  return {
    x: w * 0.5 + (p.x - CAM.x) * f,
    y: h * HORIZON - (p.y - CAM.y) * f,
    z: dz,
  }
}

function easeOut(t: number): number {
  return 1 - (1 - Math.min(1, Math.max(0, t))) ** 4
}

function drawBands(ctx: CanvasRenderingContext2D, w: number, h: number, gain: number) {
  ctx.save()
  ctx.lineCap = "butt"
  ctx.filter = "blur(18px)"
  for (const band of BANDS) {
    ctx.beginPath()
    let started = false
    for (let x = -22; x <= 22; x += 0.5) {
      const p = project({ x, y: 0, z: band.z }, w, h)
      if (p === null) {
        continue
      }
      if (!started) {
        ctx.moveTo(p.x, p.y)
        started = true
      } else {
        ctx.lineTo(p.x, p.y)
      }
    }
    const depthScale = FOCAL / (band.z - CAM.z)
    ctx.lineWidth = Math.max(2, band.width * depthScale * h)
    ctx.strokeStyle = `rgb(247 248 248 / ${band.alpha * gain})`
    ctx.stroke()
  }
  ctx.filter = "none"
  const fade = ctx.createLinearGradient(0, 0, w, 0)
  fade.addColorStop(0, "rgb(8 9 10)")
  fade.addColorStop(0.14, "rgb(8 9 10 / 0%)")
  fade.addColorStop(0.86, "rgb(8 9 10 / 0%)")
  fade.addColorStop(1, "rgb(8 9 10)")
  ctx.fillStyle = fade
  ctx.fillRect(0, h * 0.4, w, h * 0.6)
  ctx.restore()
}

function drawSolid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ax: number,
  ay: number,
  gain: number,
) {
  const world = VERTS.map((v) => add(scale(rotate(v, ax, ay), SOLID_SCALE), SOLID_POS))
  const faces = FACES.map((idx) => {
    const a = world[idx[0]]
    const b = world[idx[1]]
    const c = world[idx[2]]
    const n = normalize(cross(sub(b, a), sub(c, a)))
    const center = scale(add(add(a, b), c), 1 / 3)
    const view = normalize(sub(CAM, center))
    const facing = dot(n, view)
    const lit = Math.max(0, dot(n, LIGHT))
    const fresnel = (1 - Math.max(0, facing)) ** 2
    return { a, b, c, center, lit, fresnel, facing, depth: center.z }
  }).sort((left, right) => right.depth - left.depth)

  ctx.save()
  for (const face of faces) {
    if (face.facing <= 0.02) {
      continue
    }
    const pa = project(face.a, w, h)
    const pb = project(face.b, w, h)
    const pc = project(face.c, w, h)
    if (pa === null || pb === null || pc === null) {
      continue
    }
    const fill = 14 + face.lit * 48
    const alpha = (0.78 + face.lit * 0.18) * gain
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.lineTo(pc.x, pc.y)
    ctx.closePath()
    ctx.fillStyle = `rgb(${fill} ${fill + 1} ${fill + 2} / ${alpha})`
    ctx.fill()
    if (face.fresnel > 0.28) {
      ctx.strokeStyle = `rgb(247 248 248 / ${(0.12 + face.fresnel * 0.4) * gain})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawReflection(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ax: number,
  ay: number,
  gain: number,
) {
  ctx.save()
  ctx.globalAlpha = 0.18 * gain
  ctx.translate(0, h * HORIZON)
  ctx.scale(1, -0.55)
  ctx.translate(0, -h * HORIZON)
  drawSolid(ctx, w, h, ax, ay, gain * 0.45)
  ctx.restore()
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.42, h * 0.12, w * 0.5, h * 0.5, h * 0.82)
  g.addColorStop(0, "rgb(8 9 10 / 0%)")
  g.addColorStop(1, "rgb(8 9 10 / 28%)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function StructuralField({ dragging }: { dragging: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    draggingRef.current = dragging
  }, [dragging])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) {
      return
    }
    const ctx = canvas.getContext("2d")
    if (ctx === null) {
      return
    }
    const view = canvas
    const gfx = ctx
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const pointer = { x: 0, y: 0 }
    const rot = { x: 0.18, y: -0.42 }
    const target = { x: 0.18, y: -0.42 }
    let intro = motion.matches ? 1 : 0
    let frame = 0
    let start = 0

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const w = view.clientWidth
      const h = view.clientHeight
      view.width = Math.max(1, Math.round(w * dpr))
      view.height = Math.max(1, Math.round(h * dpr))
      gfx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function paint(now: number) {
      if (start === 0) {
        start = now
      }
      if (!motion.matches) {
        intro = easeOut((now - start) / 1100)
      }
      rot.x += (target.x - rot.x) * 0.08
      rot.y += (target.y - rot.y) * 0.08
      const w = view.clientWidth
      const h = view.clientHeight
      gfx.clearRect(0, 0, w, h)
      const gain = 0.35 + intro * 0.65
      const bandGain = gain * (draggingRef.current ? 1.25 : 1)
      const ax = rot.x + (1 - intro) * 0.22
      const ay = rot.y + (1 - intro) * -0.5
      drawBands(gfx, w, h, bandGain)
      drawReflection(gfx, w, h, ax, ay, intro)
      drawSolid(gfx, w, h, ax, ay, gain)
      drawVignette(gfx, w, h)
    }

    function loop(now: number) {
      paint(now)
      frame = window.requestAnimationFrame(loop)
    }

    function onMove(event: PointerEvent) {
      if (motion.matches) {
        return
      }
      pointer.x = event.clientX / window.innerWidth - 0.5
      pointer.y = event.clientY / window.innerHeight - 0.5
      target.x = 0.18 + pointer.y * -0.18
      target.y = -0.42 + pointer.x * 0.4
    }

    resize()
    frame = window.requestAnimationFrame(loop)
    const observer = new ResizeObserver(resize)
    observer.observe(view)
    window.addEventListener("pointermove", onMove)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  return (
    <div aria-hidden className="structural-field">
      <canvas ref={canvasRef} />
    </div>
  )
}
