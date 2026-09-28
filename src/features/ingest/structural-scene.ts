import * as THREE from "three"
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js"

const REST_ROTATION = { x: -0.32, y: -0.58 }
const PANEL_POSITIONS = [-0.49, 0, 0.49]
const STAGE_Y = -1.18

function stageMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      accent: { value: new THREE.Color(0x828fff) },
      core: { value: new THREE.Color(0x5e6ad2) },
      origin: { value: new THREE.Vector2() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorld;
      uniform vec3 accent;
      uniform vec3 core;
      uniform vec2 origin;
      void main() {
        float dx = vWorld.x - origin.x;
        float dz = vWorld.z - origin.y;
        float side = smoothstep(5.4, 0.7, abs(dx));
        float depth = smoothstep(-2.8, 2.6, vWorld.z);
        float left = smoothstep(-2.4, -0.15, vWorld.x);
        float smear = exp(-dx * dx * 0.22) * smoothstep(-0.55, 1.15, dz) * smoothstep(3.4, 0.35, dz);
        float sheen = exp(-pow(dz - 1.05, 2.0) * 0.85) * exp(-dx * dx * 0.08);
        float contact = exp(-dx * dx * 1.7 - dz * dz * 1.7);
        vec3 color = vec3(0.04, 0.042, 0.05);
        color = mix(color, vec3(0.07, 0.078, 0.1), sheen * 0.65);
        color = mix(color, core, smear * 0.62);
        color = mix(color, accent, smear * smear * 0.5 + sheen * 0.18);
        color *= 1.0 - contact * 0.42;
        float alpha = side * depth * left;
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `,
  })
}

export function mountStructuralScene(canvas: HTMLCanvasElement, onReady: () => void) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x08090a, 8.5, 22)
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80)
  camera.position.set(0, 0.12, 6.6)
  camera.lookAt(0, 0, 0)

  const geometry = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const cube = new THREE.Group()
  const bodyGeometry = new RoundedBoxGeometry(2, 2, 2, 7, 0.22)
  const faceGeometry = new RoundedBoxGeometry(1.6, 1.6, 0.05, 4, 0.06)
  const bezelGeometry = new RoundedBoxGeometry(0.46, 0.46, 0.045, 4, 0.02)
  const panelGeometry = new RoundedBoxGeometry(0.42, 0.42, 0.05, 4, 0.025)
  for (const resource of [bodyGeometry, faceGeometry, bezelGeometry, panelGeometry]) {
    geometry.add(resource)
  }

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x202329,
    metalness: 0.84,
    roughness: 0.24,
    clearcoat: 0.52,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.65,
  })
  const faceMaterial = new THREE.MeshStandardMaterial({
    color: 0x0d0f12,
    metalness: 0.72,
    roughness: 0.34,
    envMapIntensity: 1.25,
  })
  const bezelMaterial = new THREE.MeshStandardMaterial({
    color: 0x090b0f,
    metalness: 0.58,
    roughness: 0.31,
    envMapIntensity: 0.8,
  })
  const panelMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x5e6ad2,
    metalness: 0.16,
    roughness: 0.24,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    emissive: 0x2536c2,
    emissiveIntensity: 0.38,
    envMapIntensity: 1.5,
  })
  for (const material of [bodyMaterial, faceMaterial, bezelMaterial, panelMaterial]) {
    materials.add(material)
  }

  const shell = new THREE.Mesh(bodyGeometry, bodyMaterial)
  shell.castShadow = true
  cube.add(shell)

  const faceNormals = [
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
  ]
  const localNormal = new THREE.Vector3(0, 0, 1)
  for (const normal of faceNormals) {
    const face = new THREE.Group()
    face.position.copy(normal).multiplyScalar(0.93)
    face.quaternion.setFromUnitVectors(localNormal, normal)

    const plate = new THREE.Mesh(faceGeometry, faceMaterial)
    plate.position.z = 0.045
    plate.castShadow = true
    face.add(plate)

    for (const x of PANEL_POSITIONS) {
      for (const y of PANEL_POSITIONS) {
        const bezel = new THREE.Mesh(bezelGeometry, bezelMaterial)
        bezel.position.set(x, y, 0.05)
        bezel.castShadow = true
        face.add(bezel)

        const panel = new THREE.Mesh(panelGeometry, panelMaterial)
        panel.position.set(x, y, 0.055)
        panel.castShadow = true
        face.add(panel)
      }
    }

    cube.add(face)
  }
  cube.rotation.set(REST_ROTATION.x, REST_ROTATION.y, 0)
  scene.add(cube)

  const groundGeometry = new THREE.PlaneGeometry(16, 14)
  const groundMaterial = stageMaterial()
  geometry.add(groundGeometry)
  materials.add(groundMaterial)
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = STAGE_Y + 0.01
  ground.renderOrder = 1
  scene.add(ground)

  const ambient = new THREE.HemisphereLight(0xe2e6ff, 0x17191d, 1.15)
  scene.add(ambient)
  const key = new THREE.DirectionalLight(0xdce0ff, 3.2)
  key.position.set(-3.5, 4.5, 4)
  scene.add(key)
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const baseRotation = { ...REST_ROTATION }
  const targetRotation = { ...REST_ROTATION }
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
  const resizeObserver = new ResizeObserver(resize)
  let frame: number | null = null
  let pointerId: number | null = null
  let dragging = false
  let lastPointer = { x: 0, y: 0 }
  let environmentTarget: THREE.WebGLRenderTarget | null = null
  let sourceTexture: THREE.Texture | null = null
  let disposed = false

  function render() {
    renderer.render(scene, camera)
  }

  function animate() {
    frame = null
    const easing = motion.matches ? 1 : 0.11
    cube.rotation.x += (targetRotation.x - cube.rotation.x) * easing
    cube.rotation.y += (targetRotation.y - cube.rotation.y) * easing
    render()
    if (
      Math.abs(targetRotation.x - cube.rotation.x) > 0.0005 ||
      Math.abs(targetRotation.y - cube.rotation.y) > 0.0005
    ) {
      frame = window.requestAnimationFrame(animate)
    }
  }

  function scheduleRender() {
    if (frame === null) {
      frame = window.requestAnimationFrame(animate)
    }
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = canvas
    if (width === 0 || height === 0) {
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.position.z = camera.aspect < 0.68 ? 7.2 : 6.6
    camera.updateProjectionMatrix()

    const narrow = camera.aspect < 0.68
    const x = camera.aspect > 1.25 ? 1.12 : narrow ? 0.02 : 0.45
    const y = narrow ? 0.2 : 0
    cube.scale.setScalar(narrow ? 0.67 : 1.02)
    cube.position.set(x, y, 0)
    ground.position.set(x, STAGE_Y + 0.01, 0.85)
    groundMaterial.uniforms.origin.value.set(x, 0)
    camera.lookAt(0, 0, 0)
    render()
  }

  function intersectsCube(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect()
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    camera.updateMatrixWorld()
    cube.updateMatrixWorld(true)
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObject(cube, true).length > 0
  }

  function onPointerMove(event: PointerEvent) {
    if (dragging && event.pointerId === pointerId) {
      const deltaX = event.clientX - lastPointer.x
      const deltaY = event.clientY - lastPointer.y
      baseRotation.y += deltaX * 0.008
      baseRotation.x = THREE.MathUtils.clamp(baseRotation.x + deltaY * 0.008, -1.25, 1.25)
      targetRotation.x = baseRotation.x
      targetRotation.y = baseRotation.y
      lastPointer = { x: event.clientX, y: event.clientY }
      scheduleRender()
      return
    }

    const hit = intersectsCube(event)
    canvas.style.cursor = hit ? "grab" : "default"
    if (hit && !motion.matches) {
      const bounds = canvas.getBoundingClientRect()
      const x = (event.clientX - bounds.left) / bounds.width - 0.5
      const y = (event.clientY - bounds.top) / bounds.height - 0.5
      targetRotation.x = baseRotation.x - y * 0.2
      targetRotation.y = baseRotation.y + x * 0.28
    } else {
      targetRotation.x = baseRotation.x
      targetRotation.y = baseRotation.y
    }
    scheduleRender()
  }

  function onPointerDown(event: PointerEvent) {
    if (event.button !== 0 || !intersectsCube(event)) {
      return
    }
    event.preventDefault()
    dragging = true
    pointerId = event.pointerId
    lastPointer = { x: event.clientX, y: event.clientY }
    canvas.style.cursor = "grabbing"
    canvas.setPointerCapture(event.pointerId)
  }

  function onPointerUp(event: PointerEvent) {
    if (!dragging || event.pointerId !== pointerId) {
      return
    }
    dragging = false
    pointerId = null
    targetRotation.x = baseRotation.x
    targetRotation.y = baseRotation.y
    canvas.style.cursor = "grab"
    scheduleRender()
  }

  function onPointerLeave() {
    if (dragging) {
      return
    }
    targetRotation.x = baseRotation.x
    targetRotation.y = baseRotation.y
    canvas.style.cursor = "default"
    scheduleRender()
  }

  function onMotionChange() {
    if (motion.matches) {
      targetRotation.x = baseRotation.x
      targetRotation.y = baseRotation.y
      scheduleRender()
    }
  }

  function dispose() {
    if (disposed) {
      return
    }
    disposed = true
    if (frame !== null) {
      window.cancelAnimationFrame(frame)
    }
    resizeObserver.disconnect()
    canvas.removeEventListener("pointermove", onPointerMove)
    canvas.removeEventListener("pointerdown", onPointerDown)
    canvas.removeEventListener("pointerup", onPointerUp)
    canvas.removeEventListener("pointercancel", onPointerUp)
    canvas.removeEventListener("pointerleave", onPointerLeave)
    motion.removeEventListener("change", onMotionChange)
    scene.environment = null
    environmentTarget?.dispose()
    sourceTexture?.dispose()
    for (const resource of geometry) {
      resource.dispose()
    }
    for (const material of materials) {
      material.dispose()
    }
    renderer.dispose()
  }

  resizeObserver.observe(canvas.parentElement ?? canvas)
  resize()
  canvas.addEventListener("pointermove", onPointerMove)
  canvas.addEventListener("pointerdown", onPointerDown)
  canvas.addEventListener("pointerup", onPointerUp)
  canvas.addEventListener("pointercancel", onPointerUp)
  canvas.addEventListener("pointerleave", onPointerLeave)
  motion.addEventListener("change", onMotionChange)

  new THREE.TextureLoader().load(
    "/home-environment.jpg",
    (texture) => {
      sourceTexture = texture
      if (disposed) {
        texture.dispose()
        return
      }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.mapping = THREE.EquirectangularReflectionMapping
      const pmrem = new THREE.PMREMGenerator(renderer)
      let prepared = false
      try {
        environmentTarget = pmrem.fromEquirectangular(texture)
        scene.environment = environmentTarget.texture
        prepared = true
      } catch (error) {
        console.error("Could not prepare the home environment map.", error)
      } finally {
        pmrem.dispose()
        texture.dispose()
        sourceTexture = null
      }
      if (!prepared) {
        dispose()
        return
      }
      render()
      onReady()
    },
    undefined,
    (error) => {
      if (!disposed) {
        console.error("Could not load the home environment map.", error)
        dispose()
      }
    },
  )

  return dispose
}
