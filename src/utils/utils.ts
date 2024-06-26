import { IPoint, PointerState, IPoints, ExportImageFormatsMIME } from "@/types"
import { vec2 } from "gl-matrix"
import { getPreference, usePreferenceStore } from "@/stores/PreferenceStore"
import { updatePointer } from "@/managers/PointerManager"
import { Camera } from "@/objects/Camera"
import { isPoint } from "@/utils/typeguards"

interface IAppViewportSizeCache {
  width: number
  height: number
  offsetWidth: number
  offsetHeight: number
  toString: () => string
  reset: () => void
}

export const AppViewportSizeCache: IAppViewportSizeCache = {
  width: 0,
  height: 0,
  offsetHeight: 0,
  offsetWidth: 0,
  toString(): string {
    return `width: ${this.width}, height: ${this.height}, offsetWidth: ${this.offsetWidth}, offsetHeight: ${this.offsetHeight}`
  },
  reset() {
    this.width = 0
    this.height = 0
    this.offsetHeight = 0
    this.offsetWidth = 0
  },
}

export function getRelativePosition<T extends PointerState | { x: number; y: number }>(pointerState: T): T {
  pointerState.x = pointerState.x * (AppViewportSizeCache.width / AppViewportSizeCache.offsetWidth)
  pointerState.y = pointerState.y * (AppViewportSizeCache.height / AppViewportSizeCache.offsetHeight)

  return pointerState
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

/**
 * Calculate Euclidean distance between provided points
 *
 * Either a Point object or location object { x: number, y: number }
 *
 * @returns Distance in pixels
 */
export function getDistance(point0: { x: number; y: number }, point1: { x: number; y: number }): number
export function getDistance(point0: IPoint, point1: IPoint): number
export function getDistance(
  point0: IPoint | { x: number; y: number },
  point1: IPoint | { x: number; y: number },
): number {
  let a = 0
  let b = 0

  if (isPoint(point0) && isPoint(point1)) {
    a = point1.location[0] - point0.location[0]
    b = point1.location[1] - point0.location[1]
  } else {
    a = point1.x - point0.x
    b = point1.y - point0.y
  }

  return (a * a + b * b) ** 0.5
}

//https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

export const lerp = (x: number, y: number, t: number) => (1 - t) * x + t * y

export let canvasToDisplaySizeMap: Map<HTMLCanvasElement, number[]>
export let resizeObserver: ResizeObserver

interface Options {
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

/**
 * Create canvas context with solid default options and proper size
 *
 * @returns created canvas context
 *
 * @throws If context was unable to be created
 */
export function initializeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  _options: Partial<Options> = {},
): WebGL2RenderingContext {
  const defaultOptions: Options = {
    desynchronized: true,
    resize: false,
    contextType: "webgl2",
    powerPreference: "high-performance",
    // Setting alpha to false is known to have strange performance implications on some platforms (eg. intel iGPU macbooks) (possibly fixed when metal backed ANGLE was released?)
    // However it is required to be false for desynchronized to work and have DOM elements composited above the canvas
    alpha: false,
    premultipliedAlpha: false,
    colorSpace: "srgb",
    preserveDrawingBuffer: false,
    antialias: false,
  }

  const options = { ...defaultOptions, ..._options }

  // TODO: Add hiDPI setting on project creation
  const targetDpi = typeof window !== "undefined" ? window.devicePixelRatio : 1

  const newWidth = Math.round(width * targetDpi)
  const newHeight = Math.round(height * targetDpi)

  AppViewportSizeCache.width = newWidth
  AppViewportSizeCache.height = newHeight
  canvas.width = newWidth
  canvas.height = newHeight

  AppViewportSizeCache.offsetHeight = canvas.offsetHeight
  AppViewportSizeCache.offsetWidth = canvas.offsetWidth

  if (!options.resize) {
    canvas.style.width = `${width.toString()}px`
    canvas.style.height = `${height.toString()}px`
  }

  const context = canvas.getContext(options.contextType, options)

  if (!context) throw new Error("Unable to create canvas context")

  // if (typeguard(options.contextType, context)) context.scale(targetDpi, targetDpi)

  if (options.resize) {
    canvasToDisplaySizeMap = new Map([[canvas, [width, height]]])
    resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(canvas, { box: "content-box" })
  }

  return context as WebGL2RenderingContext
}

// https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html

function onResize(entries: ResizeObserverEntry[]) {
  for (const entry of entries) {
    let width: number
    let height: number
    let dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1
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

export function setCanvasSizeCache(
  canvas: HTMLCanvasElement,
  offsetWidth?: number,
  offsetHeight?: number,
  width?: number,
  height?: number,
) {
  AppViewportSizeCache.offsetWidth = offsetWidth || canvas.offsetWidth
  AppViewportSizeCache.offsetHeight = offsetHeight || canvas.offsetHeight
  AppViewportSizeCache.width = width || canvas.width
  AppViewportSizeCache.height = height || canvas.height
}

export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, callback?: () => void) {
  // Get the size the browser is displaying the canvas in device pixels.
  const canvasDisplaySize = canvasToDisplaySizeMap.get(canvas)!
  // Check if the canvas is not the same size.
  if (canvas.width !== canvasDisplaySize[0] || canvas.height !== canvasDisplaySize[1]) {
    // Make the canvas the same size

    canvas.width = canvasDisplaySize[0]
    canvas.height = canvasDisplaySize[1]

    setCanvasSizeCache(canvas)

    if (callback) callback()
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

/**
 * Throws an alert() if the user's frame rate drops too low
 *
 * @example
 * ```
 * const checkfps = performanceSafeguard()
 * // Later in requestAnimationFrame:
 * checkfps(time)
 * ```
 *
 * @returns Function that takes in RAF time
 */
export const performanceSafeguard = () => {
  const frameAverageWindow = 30
  let frameTimes: number[] = []
  let index = 0
  let totalFPS = 0

  let previousTime = 0

  return (time: number, callback?: () => void) => {
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
        (frameTimes.length === frameAverageWindow && averageFPS < 30) ||
        (frameTimes.length > 10 && averageFPS < 10)
      ) {
        callback && callback()
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

/**
 * Calculate point a given distance from `point0` in the direction of `point0 -> point1`
 */
export function calculatePointAlongDirection(
  point0: IPoint,
  point1: IPoint,
  distance: number,
): { x: number; y: number } {
  const dx = point1.x - point0.x
  const dy = point1.y - point0.y

  const totalDistance = getDistance(point0, point1)

  const normalizedX = dx / totalDistance
  const normalizedY = dy / totalDistance

  return {
    x: point0.x + normalizedX * distance,
    y: point0.y + normalizedY * distance,
  }
}

/**
 * Moves `point1` to a `targetDistance` from `point0` in the direction of `point0 -> point1`
 */
export function maintainPointSpacing(point0: IPoint, point1: IPoint, distance: number, targetDistance: number): void {
  if (distance === 0 || distance === targetDistance || distance < targetDistance) return

  if (targetDistance === 0) {
    point1.x = point0.x
    point1.y = point0.y
  }

  const dx = point1.x - point0.x
  const dy = point1.y - point0.y

  const normalizedX = dx / distance
  const normalizedY = dy / distance

  point1.x = point0.x + normalizedX * targetDistance
  point1.y = point0.y + normalizedY * targetDistance
}

/**
 * Interpolates a cubic bezier curve based on the one dimension of `start` `end` and two `control points`
 *
 * @param t position from 0...1 along curve
 * @returns number curve(t)
 */
export function cubicBezier(start: number, control1: number, control2: number, end: number, t: number): number {
  const inv = 1 - t
  const c0 = inv * inv * inv * start
  const c1 = 3 * inv * inv * t * control1
  const c2 = 3 * inv * t * t * control2
  const c3 = t * t * t * end

  return c0 + c1 + c2 + c3
}

export function pressureInterpolation(start: IPoint, end: IPoint, j: number): number {
  return lerp(start.pressure, end.pressure, j)
}

/**
 * Move curve points around to be evenly spaced from beginning to end
 *
 * @remarks
 * Interprets a sliding window of 4 points as a cubic bezier curve and adds moves the first point to the middle of that curve
 *
 * Directly manipulates input object
 *
 */
export function redistributePoints(points: IPoints) {
  for (let i = 0; i < points.length - 3; i++) {
    const start = points.at(i)!
    const control = points.at(i + 1)!
    const control2 = points.at(i + 2)!
    const end = points.at(i + 3)!

    if (start.active && control.active && control2.active && end.active) {
      // halfway along cubicBezier curve defined by the 4 current points
      const x = cubicBezier(start.x, control.x, control2.x, end.x, 0.5)
      const y = cubicBezier(start.y, control.y, control2.y, end.y, 0.5)

      const pressure = pressureInterpolation(start, end, 0.5)

      start.x = x
      start.y = y

      start.pressure = pressure
    }
  }
}

const tempVec2 = vec2.create()
/**
 * Translate coordinates from `0...width` or `0...height` to clip space `-1...1`
 */
export function toClipSpace(point: { x: number; y: number }): vec2 {
  // Calculate clip space coordinates for x and y
  const clipX = (2 * point.x) / AppViewportSizeCache.width - 1
  const clipY = 1 - (2 * point.y) / AppViewportSizeCache.height

  return vec2.set(tempVec2, clipX, clipY)
}

type CB = () => void

// https://nolanlawson.com/2019/08/11/high-performance-input-handling-on-the-web/
export function throttleRAF() {
  let queuedCallback: CB | undefined
  return (callback: CB) => {
    if (!queuedCallback) {
      requestAnimationFrame(() => {
        const cb = queuedCallback
        queuedCallback = undefined
        if (cb) cb()
      })
    }
    queuedCallback = callback
  }
}

export function calculateFromPressure(value: number, pressure: number, usePressureSensitivity: boolean) {
  let result = value

  if (usePressureSensitivity) {
    const pressureSensitivity = getPreference("pressureSensitivity") * 10

    result = value - (value * pressureSensitivity * (1 - pressure)) / (1 + pressureSensitivity)

    if (usePreferenceStore.getState().prefs.clampPressure) {
      result *= 0.9
      result += value * 0.1
    }
  }

  return result
}

export function calculateCurveLength(start: IPoint, control: IPoint, control2: IPoint, end: IPoint): number {
  // https://stackoverflow.com/questions/29438398/cheap-way-of-calculating-cubic-bezier-length
  const chord = getDistance(start, end)
  const totalDistance = getDistance(end, control2) + getDistance(control2, control) + getDistance(control, start)
  const estimatedArcLength = (totalDistance + chord) / 2

  return estimatedArcLength
}

export function calculateWorldPosition(data: { x: number; y: number }): vec2 {
  const relativePointerState = getRelativePosition(data)

  const worldPosition = Camera.getWorldPosition(relativePointerState)

  return worldPosition
}

export function calculatePointerWorldPosition(event: PointerEvent): PointerState {
  const pointerState = updatePointer(event)

  const worldPosition = calculateWorldPosition(pointerState)

  pointerState.x = worldPosition[0]
  pointerState.y = worldPosition[1]

  return pointerState
}

export function calculateSpacing(spacing: number, size: number) {
  return Math.max(0.5, size * 2 * (spacing / 100))
}

export function getFileExtensionFromMIME(string: ExportImageFormatsMIME) {
  const fileExtension = string.replace(/^(image\/)/g, "")

  return fileExtension
}

export function compareProps<T>(fields: (keyof T)[]) {
  return (prevProps: T, nextProps: T) =>
    fields.every((field) => {
      return prevProps[field] === nextProps[field]
    })
}
