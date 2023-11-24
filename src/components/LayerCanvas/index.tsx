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
  const context = canvas.getContext('2d', { willReadFrequently: true })
  context.scale(targetDpi, targetDpi)
  context.imageSmoothingQuality = 'high'
}

function _LayerCanvas({ id }, ref) {

  useEffect(() => {
    const rect = ref.current.parentElement.getBoundingClientRect();

    initializeCanvas(ref.current, rect.width, rect.height)
  }, [])

  const canvasId = `canvas_${id}`
  return <canvas ref={ref} className="layer_canvas" id={canvasId} />
}

function hasChanged(prev, next) {
  return prev.id === next.id
}

export const LayerCanvas = memo(forwardRef(_LayerCanvas), hasChanged)
