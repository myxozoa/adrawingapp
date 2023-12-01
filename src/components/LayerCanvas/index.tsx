import { useEffect, memo, forwardRef } from 'react'

import { initializeCanvas } from '../../utils';

function _LayerCanvas({ id }: { id: number }, ref: React.ForwardedRef<HTMLCanvasElement>) {

  useEffect(() => {
    const refTypeHack = ref as React.MutableRefObject<HTMLCanvasElement>
    const rect = refTypeHack.current!.parentElement!.getBoundingClientRect();

    initializeCanvas(refTypeHack.current!, rect.width, rect.height, true)
  }, [])

  const canvasId = `canvas_${id}`
  return <canvas ref={ref} className="layer_canvas" id={canvasId} />
}


function hasChanged(prevProps: Readonly<React.ComponentProps<any>>, nextProps: Readonly<React.ComponentProps<any>>): boolean {
  return prevProps.id === nextProps.id
}

export const LayerCanvas = memo(forwardRef(_LayerCanvas), hasChanged)
