import { AvailableTools, IOperation, IPoints } from "@/types"

import { Points } from "@/objects/Points"

export class Operation implements IOperation {
  points: IPoints
  tool: AvailableTools
  readyToDraw: boolean
  drawnPoints: number

  constructor(tool: AvailableTools) {
    this.points = new Points(tool.numberOfPoints)
    this.tool = tool
    this.readyToDraw = false
    this.drawnPoints = 0
  }

  public reset = () => {
    this.points.reset()
    this.readyToDraw = false
    this.drawnPoints = 0
  }

  public swapTool = (tool: AvailableTools) => {
    this.tool = tool
    this.points = new Points(tool.numberOfPoints)
  }

  public addDrawnPoints = (number?: number) => {
    if (number) this.drawnPoints += number
    else this.drawnPoints++
  }
}
