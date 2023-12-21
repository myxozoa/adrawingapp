import { AvailableTools, IOperation, Points } from "@/types"

export class Operation implements IOperation {
  points: Points
  tool: AvailableTools
  readyToDraw: boolean

  constructor(tool: AvailableTools) {
    this.points = []
    this.tool = tool
    this.readyToDraw = false
  }
}
