import { 
  Maybe,
  HexColor,
  ColorArray,
  ColorValue,
  ColorValueString,
  Operations,
  Point,
  Points,
  MouseState
} from "./types";

import { smoothLength } from "./constants";

export function getRelativeMousePos(canvas: HTMLCanvasElement, mouseState: MouseState): MouseState {
  const rect = canvas.getBoundingClientRect()

  const relativePosition = {
    x: mouseState.x - rect.left,
    y: mouseState.y - rect.top
  }

  return {
    inbounds: relativePosition.x >= 0 && relativePosition.y >= 0 && relativePosition.x <= rect.width && relativePosition.y <= rect.height,
    ...mouseState,
    ...relativePosition
  }
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


export function getDistance(point0: Point, point1: Point): number {
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

export function smoothPoints(points: Points) {
  for (let i = 0; i < Math.min(smoothLength, points.length - 1); ++i) {
      const j = (points.length - i) - 2
      const point0 = points[j]
      const point1 = points[j + 1]

      const a = 0.2
      const updatedPoint = {
          ...point0,
          pressure: (point0.pressure + point1.pressure) / 2,
          x: point0.x * (1 - a) + point1.x * a,
          y: point0.y * (1 - a) + point1.y * a
      }
      points[j] = updatedPoint
  }
}

export function findQuadtraticBezierControlPoint(startPoint: Point, midPoint: Point, endPoint: Point): Pick<Point, "x" | "y"> {
  const controlPoint = { x: midPoint.x * 2 - (startPoint.x + endPoint.x) / 2, y: midPoint.y * 2 - (startPoint.y + endPoint.y) / 2 }

  return controlPoint
}