import { 
  Maybe,
  HexColor,
  ColorArray,
  ColorValue,
  ColorValueString,
  Operations,
  Point,
  MouseState
} from "./types";

// TODO: Type this function better
export function getRelativeMousePos(canvas: HTMLCanvasElement, mouseState: MouseState | { x: number, y: number }): MouseState {
  const rect = canvas.getBoundingClientRect()

  const relativePosition = {
    x: (mouseState.x) - rect.left,
    y: (mouseState.y) - rect.top
  }

  relativePosition.x = relativePosition.x * window.devicePixelRatio
  relativePosition.y = relativePosition.y * window.devicePixelRatio

  return {
    inbounds: relativePosition.x >= 0 && relativePosition.y >= 0 && relativePosition.x <= (rect.width * window.devicePixelRatio) && relativePosition.y <= (rect.height * window.devicePixelRatio),
    ...mouseState,
    ...relativePosition
  } as MouseState
}

export function throttle(func: (...args: any[]) => void, delay = 250): () => void {
  let shouldWait = false

  return (...args) => {
    if (shouldWait) return

    func(...args)
    shouldWait = true
    setTimeout(() => {

      shouldWait = false
    }, delay)
  }
}


export function getDistance(point0: Point | { x: number, y: number }, point1: Point | { x: number, y: number }): number {
  if (!point0 || !point1) return 0

  const a = point0.x - point1.x
  const b = point0.y - point1.y

  const c = Math.sqrt( a*a + b*b )

  return c
}

export function countPoints(elements: Operations): number {
  let pointCount = 0

  elements.forEach(element => {
    pointCount += element.points.length
  })

  return pointCount
}

export function hexToRgb(hex: HexColor): Maybe<ColorArray> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
   ] : undefined;
}

export function componentToHex(color: ColorValue): ColorValueString {
  const hex = color.toString(16)
  return hex.length == 1 ? "0" + hex : hex
}

export function rgbToHex(color: ColorArray): HexColor {
  return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2])
}


export function offsetPoint(point: Point, offset: number) {
  return { ...point, x: point.x + offset, y: point.y + offset }
}

export function findQuadtraticBezierControlPoint(startPoint: Point, midPoint: Point, endPoint: Point): Pick<Point, "x" | "y"> {
  const controlPoint = { x: midPoint.x * 2 - (startPoint.x + endPoint.x) / 2, y: midPoint.y * 2 - (startPoint.y + endPoint.y) / 2 }

  return controlPoint
}

export const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;

let canvasToDisplaySizeMap
let resizeObserver

export function initializeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  desynchronized = true,
  resize = false,
  contextType = "webgl2",
  performance = "high-performance"
) {
  const targetDpi = window.devicePixelRatio

  if (!resize) {
    canvas.width = Math.floor(width * targetDpi)
    canvas.height = Math.floor(height * targetDpi)
    canvas.style.width = `${width.toString()}px`
    canvas.style.height = `${height.toString()}px`
  }

  const context = canvas.getContext(contextType, {
    alpha: true,
    desynchronized: desynchronized,
    powerPreference: performance,
    premultipliedAlpha: false,
    colorSpace: "srgb",
    preserveDrawingBuffer: false
  })

  if (contextType === "2d") context.scale(targetDpi, targetDpi)
  context.imageSmoothingEnabled = false
  
  if (resize) {
    canvasToDisplaySizeMap = new Map([[canvas, [width, height]]])
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(canvas, {box: 'content-box'})
  }

  return context
}

// https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html

function onResize(entries) {
  for (const entry of entries) {
    let width
    let height
    let dpr = window.devicePixelRatio
    if (entry.devicePixelContentBoxSize) {
      // NOTE: Only this path gives the correct answer
      // The other 2 paths are an imperfect fallback
      // for browsers that don't provide anyway to do this
      width = entry.devicePixelContentBoxSize[0].inlineSize
      height = entry.devicePixelContentBoxSize[0].blockSize
      dpr = 1; // it's already in width and height
    } else if (entry.contentBoxSize) {
      if (entry.contentBoxSize[0]) {
        width = entry.contentBoxSize[0].inlineSize
        height = entry.contentBoxSize[0].blockSize
      } else {
        // legacy
        width = entry.contentBoxSize.inlineSize
        height = entry.contentBoxSize.blockSize
      }
    } else {
      // legacy
      width = entry.contentRect.width
      height = entry.contentRect.height
    }
    const displayWidth = Math.round(width * dpr)
    const displayHeight = Math.round(height * dpr)
    canvasToDisplaySizeMap.set(entry.target, [displayWidth, displayHeight])
  }
}

export function resizeCanvasToDisplaySize(canvas, callback) {
  // Get the size the browser is displaying the canvas in device pixels.
  const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas)

  // Check if the canvas is not the same size.
  const needResize = canvas.width  !== displayWidth ||
                     canvas.height !== displayHeight

  if (needResize) {
    // Make the canvas the same size
    canvas.width  = displayWidth
    canvas.height = displayHeight

    callback()
  }

  return needResize
}

// https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately/35363027#35363027

export function HSVtoRGB(h: number, s: number, v: number) {
  let r = 0
  let g = 0
  let b = 0

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
  }
  return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
  };
}

export function RGBtoHSV(r: number, g: number, b: number) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = (max === 0 ? 0 : d / max)
  const v = max / 255

  switch (max) {
      case min: h = 0; break;
      case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
      case g: h = (b - r) + d * 2; h /= 6 * d; break;
      case b: h = (r - g) + d * 4; h /= 6 * d; break;
  }

  return {
      h: h,
      s: s,
      v: v
  };
}

export function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}

export function radiansToDegrees(radians: number) {
  return radians * (180 / Math.PI)
}

export function scaleNumberToRange(number: number, minInput: number, maxInput: number, minOutput: number, maxOutput: number) {
  // Ensure the number falls within the input range
  const clampedNumber = Math.min(Math.max(number, minInput), maxInput)

  // Calculate the scaled value
  const scaledValue = ((clampedNumber - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput

  const clampedOutput = Math.min(Math.max(scaledValue, minOutput), maxOutput)

  return clampedOutput;
}

export const getCanvasColor = function(color: ColorArray, opacity?: number) {
  const useOpacity = opacity !== undefined ? (opacity / 100).toFixed(2) : 1
  return `rgba(${color[0]},${color[1]},${color[2]}, ${useOpacity})`
}