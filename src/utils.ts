import {
  Maybe,
  HexColor,
  ColorArray,
  ColorValue,
  ColorValueString,
  Operations,
  Point,
  MouseState,
  ValueOf,
} from "@/types"

// TODO: Type this function better
export function getRelativeMousePos(
  canvas: HTMLCanvasElement,
  mouseState: MouseState | { x: number; y: number },
): MouseState {
  const rect = canvas.getBoundingClientRect()

  const style = window.getComputedStyle(canvas, null)

  const paddingLeft = parseFloat(style.getPropertyValue("padding-left"))
  const paddingTop = parseFloat(style.getPropertyValue("padding-top"))

  const relativePosition = {
    x: (mouseState.x - (rect.left + paddingLeft)) * window.devicePixelRatio,
    y: (mouseState.y - (rect.top + paddingTop)) * window.devicePixelRatio,
  }

  return {
    inbounds:
      relativePosition.x >= 0 &&
      relativePosition.y >= 0 &&
      relativePosition.x <= rect.width * window.devicePixelRatio &&
      relativePosition.y <= rect.height * window.devicePixelRatio,
    ...mouseState,
    ...relativePosition,
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

export function getDistance(
  point0: Point | { x: number; y: number },
  point1: Point | { x: number; y: number },
): number {
  if (!point0 || !point1) return 0

  const a = point0.x - point1.x
  const b = point0.y - point1.y

  const c = Math.sqrt(a * a + b * b)

  return c
}

export function countPoints(elements: Operations): number {
  let pointCount = 0

  elements.forEach((element) => {
    pointCount += element.points.length
  })

  return pointCount
}

export function hexToRgb(hex: HexColor): Maybe<ColorArray> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : undefined
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

export function findQuadtraticBezierControlPoint(
  startPoint: Point,
  midPoint: Point,
  endPoint: Point,
): Pick<Point, "x" | "y"> {
  const controlPoint = {
    x: midPoint.x * 2 - (startPoint.x + endPoint.x) / 2,
    y: midPoint.y * 2 - (startPoint.y + endPoint.y) / 2,
  }

  return controlPoint
}

export const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a

let canvasToDisplaySizeMap: Map<HTMLCanvasElement, number[]>
let resizeObserver: ResizeObserver

type Options = {
  desynchronized: boolean
  resize: boolean
  contextType: "2d" | "webgl" | "webgl2"
  powerPreference: "default" | "low-power" | "high-performance"
  alpha: boolean
  premultipliedAlpha: boolean
  colorSpace: "srgb" | "display-p3"
  preserveDrawingBuffer: boolean
  antialias: boolean
}

export function initializeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  _options: Partial<Options> = {},
) {
  const defaultOptions: Options = {
    desynchronized: true,
    resize: false,
    contextType: "webgl2",
    powerPreference: "high-performance",
    alpha: false,
    premultipliedAlpha: false,
    colorSpace: "srgb",
    preserveDrawingBuffer: false,
    antialias: false,
  }
  type entries = [keyof Options, ValueOf<Options>]
  const options: Options = Object.fromEntries(
    (Object.entries(defaultOptions) as entries[]).map(([option]) => {
      if (_options[option] !== undefined) {
        return [option, _options[option]]
      } else {
        return [option, defaultOptions[option]]
      }
    }),
  ) as Options

  const targetDpi = window.devicePixelRatio * 2

  if (!options.resize) {
    canvas.width = Math.floor(width * targetDpi)
    canvas.height = Math.floor(height * targetDpi)
    canvas.style.width = `${width.toString()}px`
    canvas.style.height = `${height.toString()}px`
  }

  const context = canvas.getContext(options.contextType, options)

  if (!context) throw new Error("Unable to create canvas context")

  const typeguard = (
    contextType: Options["contextType"],
    context: RenderingContext,
  ): context is CanvasRenderingContext2D => context && contextType === "2d"

  if (typeguard(options.contextType, context)) context.scale(targetDpi, targetDpi)

  if (options.resize) {
    canvasToDisplaySizeMap = new Map([[canvas, [width, height]]])
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(canvas, { box: "content-box" })
  }

  return context
}

// https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html

function onResize(entries: ResizeObserverEntry[]) {
  for (const entry of entries) {
    let width: number
    let height: number
    let dpr = window.devicePixelRatio
    if (entry.devicePixelContentBoxSize) {
      // NOTE: Only this path gives the correct answer
      // The other 2 paths are an imperfect fallback
      // for browsers that don't provide anyway to do this
      width = entry.devicePixelContentBoxSize[0].inlineSize
      height = entry.devicePixelContentBoxSize[0].blockSize
      dpr = 1 // it's already in width and height
    } else if (entry.contentBoxSize) {
      if (entry.contentBoxSize[0]) {
        width = entry.contentBoxSize[0].inlineSize
        height = entry.contentBoxSize[0].blockSize
      } else {
        // legacy
        // width = entry.contentBoxSize.inlineSize
        // height = entry.contentBoxSize.blockSize
        width = 0
        height = 0
      }
    } else {
      // legacy
      width = entry.contentRect.width
      height = entry.contentRect.height
    }
    const displayWidth = Math.round(width * dpr)
    const displayHeight = Math.round(height * dpr)
    canvasToDisplaySizeMap.set(entry.target as HTMLCanvasElement, [displayWidth, displayHeight])
  }
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, callback: () => void) {
  // Get the size the browser is displaying the canvas in device pixels.
  const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas)!

  // Check if the canvas is not the same size.
  const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight

  if (needResize) {
    // Make the canvas the same size
    canvas.width = displayWidth
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

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0:
      // eslint-disable-next-line no-extra-semi
      ;(r = v), (g = t), (b = p)
      break
    case 1:
      // eslint-disable-next-line no-extra-semi
      ;(r = q), (g = v), (b = p)
      break
    case 2:
      // eslint-disable-next-line no-extra-semi
      ;(r = p), (g = v), (b = t)
      break
    case 3:
      // eslint-disable-next-line no-extra-semi
      ;(r = p), (g = q), (b = v)
      break
    case 4:
      // eslint-disable-next-line no-extra-semi
      ;(r = t), (g = p), (b = v)
      break
    case 5:
      // eslint-disable-next-line no-extra-semi
      ;(r = v), (g = p), (b = q)
      break
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

export function RGBtoHSV(r: number, g: number, b: number) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const s = max === 0 ? 0 : d / max
  const v = max / 255

  switch (max) {
    case min:
      h = 0
      break
    case r:
      h = g - b + d * (g < b ? 6 : 0)
      h /= 6 * d
      break
    case g:
      h = b - r + d * 2
      h /= 6 * d
      break
    case b:
      h = r - g + d * 4
      h /= 6 * d
      break
  }

  return {
    h: h,
    s: s,
    v: v,
  }
}

export function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}

export function radiansToDegrees(radians: number) {
  return radians * (180 / Math.PI)
}

export function scaleNumberToRange(
  number: number,
  minInput: number,
  maxInput: number,
  minOutput: number,
  maxOutput: number,
) {
  // Ensure the number falls within the input range
  const clampedNumber = Math.min(Math.max(number, minInput), maxInput)

  // Calculate the scaled value
  const scaledValue = ((clampedNumber - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput

  const clampedOutput = Math.min(Math.max(scaledValue, minOutput), maxOutput)

  return clampedOutput
}

export const getCanvasColor = function (color: ColorArray, opacity?: number) {
  const useOpacity = opacity !== undefined ? (opacity / 100).toFixed(2) : 1
  return `rgba(${color[0]},${color[1]},${color[2]}, ${useOpacity})`
}

export const calculateMaxHardness = (size: number) => {
  // Log based curve fitted from eyeballing settings to get the least amount of over-hard edges
  // TODO: See if this works on all display DPIs
  const max = 23.943 * Math.log(0.905444 * size)

  return Math.min(Math.max(max, 1), 98)
}

export const calculateHardness = (hardness: number, size: number) => {
  return Math.min(hardness, calculateMaxHardness(size))
}

export const performanceSafeguard = () => {
  const frameAverageWindow = 30
  let frameTimes: number[] = []
  let index = 0
  let totalFPS = 0

  let previousTime = 0

  return (time: number) => {
    const seconds = time * 0.001
    const delta = seconds - previousTime

    if (delta) {
      previousTime = seconds
      const fps = 1 / delta

      totalFPS += fps - (frameTimes[index] || 0)

      frameTimes[index] = fps

      index++

      index = index % frameAverageWindow

      const averageFPS = totalFPS / frameTimes.length

      if (
        (frameTimes.length === frameAverageWindow && averageFPS < 40) ||
        (frameTimes.length > 10 && averageFPS < 10)
      ) {
        alert(
          "You may have hardware acceleration disabled or your device is not fast enough to run this application...",
        )

        frameTimes = []
        index = 0
        totalFPS = 0
      }
    }
  }
}

export function newPointAlongDirection(point0: Point, point1: Point, distance: number) {
  const dx = point1.x - point0.x
  const dy = point1.y - point0.y

  const totalDistance = Math.sqrt(dx * dx + dy * dy)

  const unitX = dx / totalDistance
  const unitY = dy / totalDistance

  const newX = point0.x + unitX * distance
  const newY = point0.y + unitY * distance

  return { x: newX, y: newY }
}

export function glPickPosition(gl: WebGL2RenderingContext, point: Point) {
  const rect = (gl.canvas as HTMLCanvasElement).getBoundingClientRect()

  return { x: point.x, y: rect.bottom - rect.top - point.y - 1 }
}
