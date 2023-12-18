import { useEffect, memo, forwardRef } from 'react'

function _DrawCanvas(_, ref: React.ForwardedRef<HTMLCanvasElement>) {
  // useEffect(() => {
  //   const refTypeHack = ref as React.MutableRefObject<HTMLCanvasElement>

  // }, [])

  return <canvas ref={ref} className="grow w-full h-full touch-none cursor-crosshair" />
}

export const DrawCanvas = memo(forwardRef(_DrawCanvas))
