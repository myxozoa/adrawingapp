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
  PEN: {
    availableSettings: ["size"],
    type: tool_types.STROKE,
    continuous: true,
  },
  BRUSH: {
    availableSettings: ["color", "size", "hardness", "flow", "spacing"],
    type: tool_types.STROKE,
    continuous: true,
  },
  ERASER: {
    availableSettings: ["size", "hardness", "flow", "spacing"],
    type: tool_types.STROKE,
    continuous: true,
  },
  FILL: {
    availableSettings: ["color"],
    type: tool_types.POINT,
    continuous: false,
  },
  EYEDROPPER: {
    availableSettings: [],
    type: tool_types.POINT,
    continuous: false,
  },
}

export const toolDefaults: ToolDefaults = {
  PEN: {
    size: 10,
    opacity: 100,
  },
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

export class Tool implements ITool {
  name: ToolName
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean

  init = (gl: WebGL2RenderingContext) => {
    console.log(gl)
    return
  }
}
