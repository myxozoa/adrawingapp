import { useEffect, memo, forwardRef } from 'react'

import { initializeCanvas } from '../../utils';

function _DrawCanvas(_, ref: React.ForwardedRef<HTMLCanvasElement>) {
  console.count("canvas")
  useEffect(() => {
    const refTypeHack = ref as React.MutableRefObject<HTMLCanvasElement>
    const rect = refTypeHack.current!.parentElement!.getBoundingClientRect();

    const context = initializeCanvas(refTypeHack.current!, rect.width, rect.height, true, true)

    if (!context) {
      throw new Error("WebGL2 is not supported")
    }
  }, [])

  return <canvas ref={ref} className="layer_canvas" />
}

export const DrawCanvas = memo(forwardRef(_DrawCanvas))
