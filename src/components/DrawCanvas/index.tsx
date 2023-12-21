import { memo, forwardRef } from 'react'

function _DrawCanvas(_, ref: React.ForwardedRef<HTMLCanvasElement>) {
  return <canvas ref={ref} className="absolute w-full h-full touch-none cursor-crosshair z-10" />
}

export const DrawCanvas = memo(forwardRef(_DrawCanvas))
