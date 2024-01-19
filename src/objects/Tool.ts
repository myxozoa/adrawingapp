import { IBrush, IEyedropper, IFill, IPen, ITool, ToolName, ToolSetting, ToolType, WithoutMethods } from "@/types"

import { tool_types } from "@/constants"

interface ToolMap {
  PEN: WithoutMethods<IPen>
  BRUSH: WithoutMethods<IBrush>
  ERASER: Exclude<WithoutMethods<IBrush>, "brush">
  FILL: WithoutMethods<IFill>
  EYEDROPPER: WithoutMethods<IEyedropper>
}

type ToolDefaults = {
  [K in ToolName]: K extends keyof ToolMap ? ToolMap[K] : never
}

type toolProperties = {
  [K in ToolName]: K extends keyof ToolMap ? WithoutMethods<ITool> : never
}

export const toolProperties: toolProperties = {
  // PEN: {
  //   availableSettings: ["size"],
  //   type: tool_types.STROKE,
  //   continuous: true,
  //   numberOfPoints: 8,
  // },
  BRUSH: {
    availableSettings: ["color", "size", "hardness", "flow", "spacing"],
    type: tool_types.STROKE,
    continuous: true,
    numberOfPoints: 8,
  },
  ERASER: {
    availableSettings: ["size", "hardness", "flow", "spacing"],
    type: tool_types.STROKE,
    continuous: true,
    numberOfPoints: 8,
  },
  FILL: {
    availableSettings: ["color"],
    type: tool_types.POINT,
    continuous: false,
    numberOfPoints: 1,
  },
  EYEDROPPER: {
    availableSettings: [],
    type: tool_types.POINT,
    continuous: false,
    numberOfPoints: 1,
  },
}

export const toolDefaults: ToolDefaults = {
  // PEN: {
  //   size: 10,
  //   opacity: 100,
  // },
  BRUSH: {
    size: 10,
    opacity: 100,
    flow: 100,
    hardness: 98,
    spacing: 5,
  },
  ERASER: {
    size: 20,
    opacity: 100,
    flow: 100,
    hardness: 98,
    spacing: 5,
  },
  FILL: {
    flood: true,
  },
  EYEDROPPER: {
    sampleSize: "1x1",
  },
}

// TODO: Probably no longer necessary / more trouble than its worth
export class Tool implements ITool {
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
}
