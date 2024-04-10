import { memo, forwardRef } from "react"

function _DrawCanvas(_: any, ref: React.ForwardedRef<HTMLCanvasElement>) {
  return (
    <canvas
      ref={ref}
      onContextMenu={(event) => {
        event.preventDefault()
        return false
      }}
      className="h-full w-full cursor-crosshair touch-none select-none"
    />
  )
}

export const DrawCanvas = memo(forwardRef(_DrawCanvas))
