import { useEffect, memo, forwardRef } from 'react'

import { initializeCanvas } from '../../utils';

function _DrawCanvas({ id }: { id: number }, ref: React.ForwardedRef<HTMLCanvasElement>) {

  useEffect(() => {
    const refTypeHack = ref as React.MutableRefObject<HTMLCanvasElement>
    const rect = refTypeHack.current!.parentElement!.getBoundingClientRect();

    const context = initializeCanvas(refTypeHack.current!, rect.width, rect.height, true, true)

    if (!context) {
      throw new Error("WebGL2 is not supported")
    }
  }, [])

  const canvasId = `canvas_${id}`
  return <canvas ref={ref} className="layer_canvas" id={canvasId} />
}


function hasChanged(prevProps: Readonly<React.ComponentProps<any>>, nextProps: Readonly<React.ComponentProps<any>>): boolean {
  return prevProps.id === nextProps.id
}

export const DrawCanvas = memo(forwardRef(_DrawCanvas), hasChanged)
