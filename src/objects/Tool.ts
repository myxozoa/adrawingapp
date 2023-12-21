import { AvailableTools, IBrush, IEyedropper, IFill, IPen, ITool, ToolName, ToolSetting, ToolType } from "@/types"

import { tool_types } from "@/constants"

type ToolMap = {
  PEN: IPen
  BRUSH: IBrush
  ERASER: IBrush
  FILL: IFill
  EYEDROPPER: IEyedropper
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
  },
}

export function setWithDefaults<T extends AvailableTools>(newSettings: Partial<T>, defaultSettings: T) {
  for (const setting of Object.keys(defaultSettings)) {
    this[setting] = defaultSettings[setting]
  }

  if (!newSettings) return

  for (const setting of Object.keys(newSettings)) {
    this[setting] = newSettings[setting]
  }
}

export class Tool implements ITool {
  name: ToolName
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean
}
