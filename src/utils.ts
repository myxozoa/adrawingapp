import { createProgram, createShader } from "@/glUtils"
import { Point } from "@/objects/Point"
import { Maybe, HexColor, ColorArray, ColorValue, ColorValueString, IPoint, MouseState, IPoints } from "@/types"
import { vec3 } from "gl-matrix"

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

const isPoint = (point: IPoint | { x: number; y: number }): point is IPoint => {
  return "location" in point
}

/**
 * Calculate Euclidean distance between provided points
 *
 * Either a Point object or location object { x: number, y: number }
 *
 * @returns Distance in pixels
 */
export function getDistance(
  point0: IPoint | { x: number; y: number },
  point1: IPoint | { x: number; y: number },
): number {
  if (!point0 || !point1) return 0

  if (isPoint(point0) && isPoint(point1)) {
    return vec3.distance(point0.location, point1.location)
  }

  const a = point0.x - point1.x
  const b = point0.y - point1.y

  const distance = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))

  return distance
}

//https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

/**
 * Parse hex color to rgb color array
 *
 */
export function hexToRgb(hex: HexColor): Maybe<ColorArray> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : undefined
}

/**
 * Number to hex with 1 left padding
 */
export function componentToHex(color: ColorValue): ColorValueString {
  const hex = color.toString(16)
  return hex.length == 1 ? "0" + hex : hex
}

/**
 * Translates array of 8bit rgb colors to hex
 *
 * @returns css style `#FFFFFF` color
 */
export function rgbToHex(color: ColorArray): HexColor {
  return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2])
}

export const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a

// let canvasToDisplaySizeMap: Map<HTMLCanvasElement, number[]>
// let resizeObserver: ResizeObserver

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
) {
  const defaultOptions: Options = {
    desynchronized: true,
    resize: false,
    contextType: "webgl2",
    powerPreference: "high-performance",
    alpha: false,
    premultipliedAlpha: false,
    colorSpace: "srgb",
    preserveDrawingBuffer: true,
    antialias: false,
  }

  const options = { ...defaultOptions, ..._options }

  const targetDpi = window.devicePixelRatio

  // if (!options.resize) {
  canvas.width = Math.floor(width * targetDpi)
  canvas.height = Math.floor(height * targetDpi)
  canvas.style.width = `${width.toString()}px`
  canvas.style.height = `${height.toString()}px`
  // }

  // TODO: fix this type
  const context = canvas.getContext(options.contextType as string, options)

  if (!context) throw new Error("Unable to create canvas context")

  // const typeguard = (
  //   contextType: Options["contextType"],
  //   context: RenderingContext,
  // ): context is CanvasRenderingContext2D => context && contextType === "2d"

  // if (typeguard(options.contextType, context)) context.scale(targetDpi, targetDpi)

  // if (options.resize) {
  //   canvasToDisplaySizeMap = new Map([[canvas, [width, height]]])
  //   resizeObserver = new ResizeObserver(onResize)
  //   resizeObserver.observe(canvas, { box: "content-box" })
  // }

  return context
}

// https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html

// function onResize(entries: ResizeObserverEntry[]) {
//   for (const entry of entries) {
//     let width: number
//     let height: number
//     let dpr = window.devicePixelRatio
//     if (entry.devicePixelContentBoxSize) {
//       // NOTE: Only this path gives the correct answer
//       // The other 2 paths are an imperfect fallback
//       // for browsers that don't provide anyway to do this
//       width = entry.devicePixelContentBoxSize[0].inlineSize
//       height = entry.devicePixelContentBoxSize[0].blockSize
//       dpr = 1 // it's already in width and height
//     } else if (entry.contentBoxSize) {
//       if (entry.contentBoxSize[0]) {
//         width = entry.contentBoxSize[0].inlineSize
//         height = entry.contentBoxSize[0].blockSize
//       } else {
//         // legacy
//         // width = entry.contentBoxSize.inlineSize
//         // height = entry.contentBoxSize.blockSize
//         width = 0
//         height = 0
//       }
//     } else {
//       // legacy
//       width = entry.contentRect.width
//       height = entry.contentRect.height
//     }
//     const displayWidth = Math.round(width * dpr)
//     const displayHeight = Math.round(height * dpr)
//     canvasToDisplaySizeMap.set(entry.target as HTMLCanvasElement, [displayWidth, displayHeight])
//   }
// }

// export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement, callback: () => void) {
// // Get the size the browser is displaying the canvas in device pixels.
// const [displayWidth, displayHeight] = canvasToDisplaySizeMap.get(canvas)!
// // Check if the canvas is not the same size.
// const needResize = canvas.width !== displayWidth || canvas.height !== displayHeight
// if (needResize) {
//   // Make the canvas the same size
//   canvas.width = displayWidth
//   canvas.height = displayHeight
//   callback()
// }
// return needResize
// }

// https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately/35363027#35363027

/**
 * @example
 * ```
 *  const { r, g, b } = HSVtoRGB(hsvState.hue / 360, saturationPercentage, 1 - valuePercentage)
 * ```
 */
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
      ;(r = v), (g = t), (b = p)
      break
    case 1:
      ;(r = q), (g = v), (b = p)
      break
    case 2:
      ;(r = p), (g = v), (b = t)
      break
    case 3:
      ;(r = p), (g = q), (b = v)
      break
    case 4:
      ;(r = t), (g = p), (b = v)
      break
    case 5:
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

/**
 * Translates array of 8bit rgb colors to rgba
 *
 * @returns css style `rgba()` string
 */
export const getCanvasColor = function (color: ColorArray, opacity?: number) {
  const useOpacity = opacity !== undefined ? (opacity / 100).toFixed(2) : 1
  return `rgba(${color[0]},${color[1]},${color[2]}, ${useOpacity})`
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
 * Create new point a given distance from `point0` in the direction of `point0 -> point1`
 */
export function newPointAlongDirection(point0: IPoint, point1: IPoint, distance: number): IPoint {
  const dx = point1.x - point0.x
  const dy = point1.y - point0.y

  const totalDistance = Math.sqrt(dx * dx + dy * dy)

  const normalizedX = dx / totalDistance
  const normalizedY = dy / totalDistance

  const newX = point0.x + normalizedX * distance
  const newY = point0.y + normalizedY * distance

  return new Point({ ...point0, x: newX, y: newY })
}

export function glPickPosition(gl: WebGL2RenderingContext, point: IPoint) {
  const rect = (gl.canvas as HTMLCanvasElement).getBoundingClientRect()

  return { x: point.x, y: rect.bottom - rect.top - point.y - 1 }
}

/**
 * Interpolates a cubic bezier curve based on the one dimension of `start` `end` and two `control points`
 *
 * @param t position from 0...1 along curve
 * @returns number curve(t)
 */
export function cubicBezier(start: number, control1: number, control2: number, end: number, t: number): number {
  // B(t) = (1−t)^3 p1 + 3(1−t)^2 t p2 + 3(1−t) t^2 p3 + t^3 p4

  return (
    Math.pow(1 - t, 3) * start +
    3 * Math.pow(1 - t, 2) * t * control1 +
    3 * (1 - t) * Math.pow(t, 2) * control2 +
    Math.pow(t, 3) * end
  )
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

/**
 * Translate coordinates from `0...width` or `0...height` to clip space `-1...1`
 */
export function toClipSpace(
  point: { x: number; y: number },
  canvas: HTMLCanvasElement | OffscreenCanvas,
): { x: number; y: number } {
  // Calculate clip space coordinates for x and y
  const clipX = (2 * point.x) / canvas.width - 1
  const clipY = 1 - (2 * point.y) / canvas.height

  return { x: clipX, y: clipY }
}

/**
 * @example
 * ```
 * debugPoints(this.gl, this.renderBufferInfo, this.currentOperation!.points, "1., 0., 1., 1.")
 * ```
 */
export const debugPoints = (
  gl: WebGL2RenderingContext,
  renderBufferInfo: any,
  points: IPoints,
  color: string,
): void => {
  // Bind to draw to render texture

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  gl.bindTexture(gl.TEXTURE_2D, renderBufferInfo.targetTexture)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderBufferInfo.framebuffer)

  // Transform points to clip space
  const vertices = points.list.reduce((acc: number[], point: IPoint) => {
    const clipSpace = toClipSpace(point, gl.canvas)
    return [...acc, clipSpace.x, clipSpace.y]
  }, [] as number[])

  const vertex_buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

  // Vert Shader

  const vertexShaderCode = `#version 300 es
  #pragma vscode_glsllint_stage : vert
  in vec2 a_Position;
  void main() {
    gl_Position = vec4(a_Position, 0., 1.);
    gl_PointSize = 5.0;
  }`

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderCode)

  // Frag Shader

  const fragmentShaderCode = `#version 300 es
  #pragma vscode_glsllint_stage : frag
  precision mediump float;
  out vec4 fragColor;
  void main() {
    fragColor = vec4(${color});
  }`

  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode)

  const shaderProgram = createProgram(gl, vertexShader, fragmentShader)

  gl.useProgram(shaderProgram)

  // VAO

  const vao = gl.createVertexArray()
  gl.bindVertexArray(vao)

  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer)

  const coord = gl.getAttribLocation(shaderProgram, "a_Position")

  gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(coord)

  // Draw

  gl.drawArrays(gl.POINTS, 0, vertices.length / 2)

  // Unbind

  gl.bindVertexArray(null)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
}
