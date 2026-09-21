import { useEffect, useRef } from "react"

type Vec3 = { x: number; y: number; z: number }
type Proj = { x: number; y: number; z: number }
type Kind = "frame" | "cell" | "bevel"
type Tri = { a: Vec3; b: Vec3; c: Vec3; n: Vec3; kind: Kind; pivot: Vec3 }
type Face = { n: Vec3; u: Vec3; v: Vec3 }

const CAM = { x: 0.1, y: 1.16, z: -2.05 }
const FOCAL = 2.62
const HORIZON = 0.47
const KEY = normalize({ x: -0.48, y: 0.78, z: 0.4 })
const FILL = normalize({ x: 0.55, y: 0.08, z: -0.12 })
const RIM = normalize({ x: 0.7, y: 0.18, z: -0.68 })
const SOLID_SCALE = 0.9
const SOLID_POS = { x: 0.28, y: 0.9, z: 3.08 }
const RADIUS = 0.22
const SEG = 22
const CELLS = 3
const EXTRUDE = 0.02
const CHAMFER = 0.022
const REST_ROT = { x: -0.34, y: -0.6 }

const FACES: Face[] = [
  { n: { x: 1, y: 0, z: 0 }, u: { x: 0, y: 1, z: 0 }, v: { x: 0, y: 0, z: 1 } },
  { n: { x: -1, y: 0, z: 0 }, u: { x: 0, y: 1, z: 0 }, v: { x: 0, y: 0, z: -1 } },
  { n: { x: 0, y: 1, z: 0 }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 0, z: -1 } },
  { n: { x: 0, y: -1, z: 0 }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 0, z: 1 } },
  { n: { x: 0, y: 0, z: 1 }, u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } },
  { n: { x: 0, y: 0, z: -1 }, u: { x: -1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } },
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
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

function project(p: Vec3, w: number, h: number): Proj | null {
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

function roundBox(p: Vec3): Vec3 {
  const s = 1 - RADIUS
  const cx = clamp(p.x, -s, s)
  const cy = clamp(p.y, -s, s)
  const cz = clamp(p.z, -s, s)
  const dx = p.x - cx
  const dy = p.y - cy
  const dz = p.z - cz
  const len = Math.hypot(dx, dy, dz)
  if (len < 1e-8) {
    return { x: cx, y: cy, z: cz }
  }
  const k = RADIUS / len
  return { x: cx + dx * k, y: cy + dy * k, z: cz + dz * k }
}

function roundBoxNormal(p: Vec3): Vec3 {
  const s = 1 - RADIUS
  const dx = p.x - clamp(p.x, -s, s)
  const dy = p.y - clamp(p.y, -s, s)
  const dz = p.z - clamp(p.z, -s, s)
  return normalize({ x: dx, y: dy, z: dz })
}

function facePoint(face: Face, uu: number, vv: number): Vec3 {
  return {
    x: face.n.x + face.u.x * uu + face.v.x * vv,
    y: face.n.y + face.u.y * uu + face.v.y * vv,
    z: face.n.z + face.u.z * uu + face.v.z * vv,
  }
}

function surface(face: Face, uu: number, vv: number, along: number): Vec3 {
  return add(roundBox(facePoint(face, uu, vv)), scale(face.n, along))
}

function pushTri(mesh: Tri[], a: Vec3, b: Vec3, c: Vec3, n: Vec3, kind: Kind, pivot: Vec3) {
  mesh.push({ a, b, c, n, kind, pivot })
}

function pushQuad(mesh: Tri[], a: Vec3, b: Vec3, c: Vec3, d: Vec3, n: Vec3, kind: Kind) {
  const pivot = scale(add(add(add(a, b), c), d), 0.25)
  pushTri(mesh, a, b, c, n, kind, pivot)
  pushTri(mesh, a, c, d, n, kind, pivot)
}

function buildMesh(): Tri[] {
  const mesh: Tri[] = []
  const inner = 1 - RADIUS - 0.012

  for (const face of FACES) {
    for (let i = 0; i < SEG; i += 1) {
      for (let j = 0; j < SEG; j += 1) {
        const u0 = -1 + (2 * i) / SEG
        const u1 = -1 + (2 * (i + 1)) / SEG
        const v0 = -1 + (2 * j) / SEG
        const v1 = -1 + (2 * (j + 1)) / SEG
        if (Math.abs(u0) < inner && Math.abs(u1) < inner && Math.abs(v0) < inner && Math.abs(v1) < inner) {
          continue
        }
        const a = roundBox(facePoint(face, u0, v0))
        const b = roundBox(facePoint(face, u1, v0))
        const c = roundBox(facePoint(face, u1, v1))
        const d = roundBox(facePoint(face, u0, v1))
        const mid = facePoint(face, (u0 + u1) * 0.5, (v0 + v1) * 0.5)
        pushQuad(mesh, a, b, c, d, roundBoxNormal(mid), "frame")
      }
    }

    const plate = [
      surface(face, -inner, -inner, 0),
      surface(face, inner, -inner, 0),
      surface(face, inner, inner, 0),
      surface(face, -inner, inner, 0),
    ]
    pushQuad(mesh, plate[0], plate[1], plate[2], plate[3], face.n, "frame")

    const groove = 0.048
    const span = inner * 2
    const cell = (span - groove * (CELLS + 1)) / CELLS
    const origin = -inner + groove
    for (let i = 0; i < CELLS; i += 1) {
      for (let j = 0; j < CELLS; j += 1) {
        const u0 = origin + i * (cell + groove)
        const v0 = origin + j * (cell + groove)
        const u1 = u0 + cell
        const v1 = v0 + cell
        const ui0 = u0 + CHAMFER
        const vi0 = v0 + CHAMFER
        const ui1 = u1 - CHAMFER
        const vi1 = v1 - CHAMFER
        const o00 = surface(face, u0, v0, EXTRUDE * 0.35)
        const o10 = surface(face, u1, v0, EXTRUDE * 0.35)
        const o11 = surface(face, u1, v1, EXTRUDE * 0.35)
        const o01 = surface(face, u0, v1, EXTRUDE * 0.35)
        const i00 = surface(face, ui0, vi0, EXTRUDE)
        const i10 = surface(face, ui1, vi0, EXTRUDE)
        const i11 = surface(face, ui1, vi1, EXTRUDE)
        const i01 = surface(face, ui0, vi1, EXTRUDE)
        pushQuad(mesh, i00, i10, i11, i01, face.n, "cell")
        pushQuad(mesh, o00, o10, i10, i00, normalize(cross(sub(o10, o00), sub(i00, o00))), "bevel")
        pushQuad(mesh, o10, o11, i11, i10, normalize(cross(sub(o11, o10), sub(i10, o10))), "bevel")
        pushQuad(mesh, o11, o01, i01, i11, normalize(cross(sub(o01, o11), sub(i11, o11))), "bevel")
        pushQuad(mesh, o01, o00, i00, i01, normalize(cross(sub(o00, o01), sub(i01, o01))), "bevel")
      }
    }
  }

  return mesh
}

const MESH = buildMesh()

function toWorld(p: Vec3, ax: number, ay: number): Vec3 {
  return add(scale(rotate(p, ax, ay), SOLID_SCALE), SOLID_POS)
}

function shade(n: Vec3, view: Vec3, kind: Kind, gain: number): string {
  const ndl = Math.max(0, dot(n, KEY))
  const ndf = Math.max(0, dot(n, FILL))
  const ndr = Math.max(0, dot(n, RIM))
  const ndh = Math.max(0, dot(n, normalize(add(KEY, view))))
  const spec = Math.pow(ndh, kind === "cell" ? 36 : 16) * (kind === "cell" ? 1.2 : 0.35)
  const specBroad = Math.pow(ndh, 7) * (kind === "cell" ? 0.38 : 0.12)
  const fresnel = (1 - Math.max(0, dot(n, view))) ** 2
  const hemi = kind === "frame" ? 0.48 : 0.3 + 0.7 * (n.y * 0.5 + 0.5)
  const albedo = kind === "cell" ? 1 : kind === "bevel" ? 0.26 : 0.34
  const keyGain = kind === "cell" ? 62 : kind === "bevel" ? 18 : 8
  const light = hemi * (kind === "frame" ? 6 : 8) + (kind === "frame" ? 0.22 : ndl) * keyGain + ndf * 7
  const glow = (spec + specBroad) * (kind === "cell" ? 132 : 36)
  const rim = ndr * 0.14 + fresnel * (kind === "cell" ? 0.1 : 0.2)
  const r = (light + glow) * albedo + rim * 52
  const g = (light + glow) * albedo + rim * 60
  const b = (light + glow) * albedo + 2 + rim * 96
  const alpha = (0.96 + ndl * 0.04) * gain
  return `rgb(${clamp(r, 0, 255)} ${clamp(g, 0, 255)} ${clamp(b, 0, 255)} / ${alpha})`
}

function drawFloor(ctx: CanvasRenderingContext2D, w: number, h: number, gain: number) {
  const foot = project({ x: SOLID_POS.x, y: 0, z: SOLID_POS.z }, w, h)
  const stage = ctx.createLinearGradient(0, h * 0.58, 0, h)
  stage.addColorStop(0, "rgb(8 9 10 / 0%)")
  stage.addColorStop(1, `rgb(8 9 10 / ${0.42 * gain})`)
  ctx.fillStyle = stage
  ctx.fillRect(0, h * 0.52, w, h * 0.48)
  if (foot === null) {
    return
  }
  const radius = project({ x: SOLID_POS.x + 1.15, y: 0, z: SOLID_POS.z }, w, h)
  const rx = radius === null ? 120 : Math.abs(radius.x - foot.x)
  ctx.save()
  ctx.filter = "blur(32px)"
  ctx.fillStyle = `rgb(247 248 248 / ${0.05 * gain})`
  ctx.beginPath()
  ctx.ellipse(foot.x - rx * 0.16, foot.y + 6, rx * 1.7, rx * 0.3, -0.36, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = `rgb(0 0 0 / ${0.48 * gain})`
  ctx.beginPath()
  ctx.ellipse(foot.x, foot.y, rx * 0.84, rx * 0.24, 0, 0, Math.PI * 2)
  ctx.fill()
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
  const faces = MESH.map((tri) => {
    const a = toWorld(tri.a, ax, ay)
    const b = toWorld(tri.b, ax, ay)
    const c = toWorld(tri.c, ax, ay)
    const n = normalize(rotate(tri.n, ax, ay))
    const pivot = toWorld(tri.pivot, ax, ay)
    const view = normalize(sub(CAM, pivot))
    const depth = (a.z + b.z + c.z) / 3
    return { a, b, c, n, view, kind: tri.kind, facing: dot(n, view), depth }
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
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.lineTo(pc.x, pc.y)
    ctx.closePath()
    ctx.fillStyle = shade(face.n, face.view, face.kind, gain)
    ctx.fill()
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
  const foot = project({ x: SOLID_POS.x, y: 0, z: SOLID_POS.z }, w, h)
  const origin = foot?.y ?? h * HORIZON
  ctx.save()
  ctx.globalAlpha = 0.14 * gain
  ctx.translate(0, origin)
  ctx.scale(1, -0.38)
  ctx.translate(0, -origin)
  drawSolid(ctx, w, h, ax, ay, gain * 0.38)
  ctx.restore()
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w * 0.52, h * 0.46, h * 0.1, w * 0.5, h * 0.52, h * 0.84)
  g.addColorStop(0, "rgb(8 9 10 / 0%)")
  g.addColorStop(1, "rgb(8 9 10 / 34%)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function StructuralField({ dragging }: { dragging: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const draggingRef = useRef(false)
  const kickRef = useRef(() => {})
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    draggingRef.current = dragging
    kickRef.current()
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
    const rot = { x: REST_ROT.x, y: REST_ROT.y }
    const target = { x: REST_ROT.x, y: REST_ROT.y }
    let intro = motion.matches ? 1 : 0
    let start = 0

    function settled(): boolean {
      return Math.abs(target.x - rot.x) < 0.0008 && Math.abs(target.y - rot.y) < 0.0008
    }

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
      const ax = rot.x + (1 - intro) * 0.22
      const ay = rot.y + (1 - intro) * -0.5
      drawFloor(gfx, w, h, gain * (draggingRef.current ? 1.18 : 1))
      drawReflection(gfx, w, h, ax, ay, intro)
      drawSolid(gfx, w, h, ax, ay, gain)
      drawVignette(gfx, w, h)
    }

    function shouldLoop(): boolean {
      return !motion.matches && (intro < 1 || !settled())
    }

    function loop(now: number) {
      frameRef.current = null
      paint(now)
      if (shouldLoop()) {
        // react-doctor-disable-next-line react-doctor/effect-raf-loop-needs-cancel -- cancelLoop runs on unmount and when reduced motion is enabled.
        frameRef.current = window.requestAnimationFrame(loop)
        return
      }
    }

    function cancelLoop() {
      if (frameRef.current === null) {
        return
      }
      window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    function kick() {
      if (motion.matches) {
        paint(performance.now())
        return
      }
      if (frameRef.current !== null) {
        return
      }
      // react-doctor-disable-next-line react-doctor/effect-raf-loop-needs-cancel -- cancelLoop runs on unmount and when reduced motion is enabled.
      frameRef.current = window.requestAnimationFrame(loop)
    }

    function setTarget(clientX: number, clientY: number) {
      const pointerX = clientX / window.innerWidth - 0.5
      const pointerY = clientY / window.innerHeight - 0.5
      target.x = REST_ROT.x + pointerY * -0.16
      target.y = REST_ROT.y + pointerX * (draggingRef.current ? 0.5 : 0.34)
      kick()
    }

    function onMove(event: PointerEvent) {
      if (motion.matches) {
        return
      }
      setTarget(event.clientX, event.clientY)
    }

    function onDragOver(event: DragEvent) {
      if (motion.matches || !draggingRef.current) {
        return
      }
      setTarget(event.clientX, event.clientY)
    }

    function onMotionChange() {
      if (motion.matches) {
        intro = 1
        rot.x = target.x
        rot.y = target.y
        cancelLoop()
        paint(performance.now())
        return
      }
      kick()
    }

    kickRef.current = kick
    resize()
    paint(performance.now())
    kick()
    const observer = new ResizeObserver(() => {
      resize()
      paint(performance.now())
      kick()
    })
    observer.observe(view)
    window.addEventListener("pointermove", onMove)
    window.addEventListener("dragover", onDragOver)
    motion.addEventListener("change", onMotionChange)
    return () => {
      kickRef.current = () => {}
      cancelLoop()
      observer.disconnect()
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("dragover", onDragOver)
      motion.removeEventListener("change", onMotionChange)
    }
  }, [])

  return (
    <div aria-hidden data-dragging={dragging ? "true" : undefined} className="structural-field">
      <canvas ref={canvasRef} />
      <div className="structural-field-pulse" />
    </div>
  )
}
