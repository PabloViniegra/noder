import { useEffect, useRef, useState } from "react"

export function StructuralField({ dragging }: { dragging: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sceneReady, setSceneReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) {
      return
    }
    let active = true
    let dispose = () => {}
    void import("./structural-scene")
      .then(({ mountStructuralScene }) => {
        if (!active) {
          return
        }
        try {
          dispose = mountStructuralScene(canvas, () => {
            if (active) {
              setSceneReady(true)
            }
          })
        } catch (error) {
          console.error("Could not initialize the 3D home field.", error)
        }
      })
      .catch(() => {
        console.error("Could not load the 3D home field.")
      })

    return () => {
      active = false
      dispose()
    }
  }, [])

  return (
    <div
      aria-hidden
      data-dragging={dragging ? "true" : undefined}
      data-scene-ready={sceneReady ? "true" : undefined}
      className="structural-field"
    >
      <img src="/home-field.jpg" alt="" className="structural-field-image" draggable={false} />
      <canvas ref={canvasRef} className="structural-field-canvas" />
      <div className="structural-field-pulse" />
    </div>
  )
}
