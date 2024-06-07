import type { ITool, ToolName, ToolSetting, ToolType } from "@/types"

// TODO: Probably no longer necessary / more trouble than its worth
export abstract class Tool implements ITool {
  name: ToolName
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean
  numberOfPoints: number

  constructor() {
    this.numberOfPoints = 1
  }

  /** @virtual */
  init = (gl: WebGL2RenderingContext) => {
    console.log(gl)
    return
  }

  /** @virtual */
  reset = () => {
    return
  }

  /** @virtual */
  end = () => {
    return
  }
}
