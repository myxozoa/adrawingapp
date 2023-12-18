import { Operation as IOperation, ITool } from "../types"

export class Operation implements IOperation {
  points: Points
  tool: Tool
  readyToDraw: boolean

  constructor (tool: ITool) {
    this.points = []
    this.tool = tool
    this.readyToDraw = false
  }
}
