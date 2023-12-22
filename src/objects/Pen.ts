import { tool_list } from "@/constants"
import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { IPen } from "@/types"

export class Pen extends Tool implements IPen {
  size: number
  opacity: number

  constructor(settings: Partial<IPen> = {}) {
    super()
    this.name = tool_list.PEN
    setWithDefaults.call(this, settings, toolDefaults.PEN)
  }

  init = () => {
    return
  }

  // basePen = (operation: IOperation) => {
  //   const gl = this.gl
  //   const points = operation.points

  //   gl.lineCap = "round"
  //   gl.lineJoin = "round"
  //   gl.miterLimit = 10
  //   gl.strokeStyle = getCanvasColor(this.main.color, operation.tool.opacity)

  //   // TODO: make less lazy
  //   if (points.length < 3) {
  //     const point0 = points[0]
  //     const point1 = points[1]

  //     gl.beginPath()

  //     gl.moveTo(point0.x, point0.y)
  //     gl.lineTo(point1.x, point1.y)
  //     gl.stroke()
  //   } else {
  //     // We need to have slightly overlapping curves otherwise we likely have holes when the list of points is shortened
  //     for (let i = 2; i < points.length - 1; i += 1) {
  //       const startPoint = points[i - 2]
  //       const midPoint = points[i - 1]
  //       const endPoint = points[i]
  //       gl.beginPath()

  //       gl.moveTo(startPoint.x, startPoint.y)

  //       const controlPoint = findQuadtraticBezierControlPoint(startPoint, midPoint, endPoint)

  //       if (midPoint.pointerType === "pen") {
  //         gl.lineWidth = operation.tool.size! * midPoint.pressure
  //       } else {
  //         gl.lineWidth = operation.tool.size!
  //       }

  //       gl.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y)

  //       gl.stroke()
  //     }

  //     if (points.length % 3 < 3) {
  //       for (let i = points.length - (points.length % 3); i < points.length; i++) {
  //         const point0 = points[i - 1]
  //         const point1 = points[i]
  //         gl.beginPath()

  //         gl.moveTo(point0.x, point0.y)
  //         gl.lineTo(point1.x, point1.y)
  //         gl.stroke()
  //       }
  //     }
  //   }
  // }
}
