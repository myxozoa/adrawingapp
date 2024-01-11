import { AvailableTools, IOperation, IPoints } from "@/types"

import { Points } from "@/objects/Points"

export class Operation implements IOperation {
  points: IPoints
  tool: AvailableTools
  readyToDraw: boolean

  constructor(tool: AvailableTools) {
    this.points = new Points(tool.numberOfPoints)
    this.tool = tool
    this.readyToDraw = false
  }
}
