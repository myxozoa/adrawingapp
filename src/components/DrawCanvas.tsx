import { memo, forwardRef } from "react"

function _DrawCanvas(_: any, ref: React.ForwardedRef<HTMLCanvasElement>) {
  return <canvas ref={ref} className="h-1 w-full cursor-crosshair touch-none" />
}

export const DrawCanvas = memo(forwardRef(_DrawCanvas))
