function makeLensMap(): string {
  const size = 256
  const canvas = document.createElement("canvas")
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (ctx === null) {
    return ""
  }
  const img = ctx.createImageData(size, size)
  const mid = size / 2
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (x - mid) / mid
      const dy = (y - mid) / mid
      const radius = Math.hypot(dx, dy)
      const falloff = radius < 1 ? radius ** 1.45 : 1
      const i = (y * size + x) * 4
      img.data[i] = 128 + dx * falloff * 127
      img.data[i + 1] = 128 + dy * falloff * 127
      img.data[i + 2] = 128
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL("image/png")
}

let lensMap = ""

function getLensMap(): string {
  if (lensMap !== "") {
    return lensMap
  }
  lensMap = makeLensMap()
  return lensMap
}

export function GlassFilter() {
  const map = getLensMap()
  if (map === "") {
    return null
  }
  return (
    <svg aria-hidden className="pointer-events-none absolute h-0 w-0" focusable="false">
      <filter
        id="noder-lens"
        colorInterpolationFilters="sRGB"
        filterUnits="objectBoundingBox"
        primitiveUnits="userSpaceOnUse"
        x="-0.08"
        y="-0.08"
        width="1.16"
        height="1.16"
      >
        <feImage href={map} preserveAspectRatio="none" result="map" width="1" height="1" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale="28"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  )
}

export function GlassLayers() {
  return (
    <>
      <div aria-hidden className="glass-refract" />
      <div aria-hidden className="glass-rim" />
      <div aria-hidden data-glass-sheen className="glass-sheen" />
    </>
  )
}
