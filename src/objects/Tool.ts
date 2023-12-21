import {
  AvailableTools,
  IBrush,
  IEyedropper,
  IFill,
  IPen,
  ITool,
  ToolName,
  ToolSetting,
  ToolType,
  WithoutMethods,
} from "@/types"

import { tool_types } from "@/constants"

type ToolMap = {
  PEN: WithoutMethods<IPen>
  BRUSH: WithoutMethods<IBrush>
  ERASER: Exclude<WithoutMethods<IBrush>, "brush">
  FILL: WithoutMethods<IFill>
  EYEDROPPER: WithoutMethods<IEyedropper>
}

type ToolDefaults = {
  [K in ToolName]: K extends keyof ToolMap ? ToolMap[K] : never
}

export const toolDefaults: ToolDefaults = {
  PEN: {
    size: 10,
    opacity: 100,
    availableSettings: ["size"],
    type: tool_types.STROKE,
    continuous: true,
  },
  BRUSH: {
    size: 10,
    opacity: 100,
    flow: 100,
    hardness: 98,
    spacing: 5,
    availableSettings: ["size", "hardness", "flow", "spacing"],
    type: tool_types.STROKE,
    continuous: true,
  },
  ERASER: {
    size: 20,
    opacity: 100,
    flow: 100,
    hardness: 98,
    spacing: 5,
    availableSettings: ["size", "hardness", "flow", "spacing"],
    type: tool_types.STROKE,
    continuous: true,
  },
  FILL: {
    flood: true,
    availableSettings: ["color"],
    type: tool_types.POINT,
    continuous: false,
  },
  EYEDROPPER: {
    availableSettings: [],
    type: tool_types.POINT,
    continuous: false,
    sampleSize: "1x1",
  },
}

export function setWithDefaults<T extends AvailableTools>(
  this: T,
  newSettings: Partial<WithoutMethods<T>>,
  defaultSettings: WithoutMethods<T>,
) {
  for (const setting of Object.keys(defaultSettings) as (keyof typeof defaultSettings)[]) {
    this[setting] = defaultSettings[setting]
  }

  for (const setting of Object.keys(newSettings) as (keyof typeof newSettings)[]) {
    this[setting] = newSettings[setting]!
  }
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
