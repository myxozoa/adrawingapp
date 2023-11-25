import { useEffect, memo, forwardRef } from 'react'

function initializeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  const targetDpi = window.devicePixelRatio
  canvas.width = Math.floor(width * targetDpi)
  canvas.height = Math.floor(height * targetDpi)
  canvas.style.width = `${width.toString()}px`
  canvas.style.height = `${height.toString()}px`
  const context = canvas.getContext('2d', { willReadFrequently: false })
  context!.scale(targetDpi, targetDpi)
  context!.imageSmoothingQuality = 'high'
}

function _LayerCanvas({ id }: { id: number }, ref: React.ForwardedRef<HTMLCanvasElement>) {

  useEffect(() => {
    const refTypeHack = ref as React.MutableRefObject<HTMLCanvasElement>
    const rect = refTypeHack.current!.parentElement!.getBoundingClientRect();

    initializeCanvas(refTypeHack.current!, rect.width, rect.height)
  }, [])

  const canvasId = `canvas_${id}`
  return <canvas ref={ref} className="layer_canvas" id={canvasId} />
}


function hasChanged(prevProps: Readonly<React.ComponentProps<any>>, nextProps: Readonly<React.ComponentProps<any>>): boolean {
  return prevProps.id === nextProps.id
}

export const LayerCanvas = memo(forwardRef(_LayerCanvas), hasChanged)
