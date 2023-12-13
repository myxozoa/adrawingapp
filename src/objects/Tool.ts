import { ITool, ToolName, ToolSetting, ToolType } from "../types"

import { tool_list, tool_types } from "../constants"

const toolDefaults: Record<ToolName, ITool> = {
  PEN: {
    name: tool_list.PEN,
    size: 10,
    opacity: 100,
    hardness: 98,
    spacing: 10,
    availableSettings: [ "color", "size" ],
    type: tool_types.STROKE,
    continuous: true
  } as Tool,
  BRUSH: {
    name: tool_list.BRUSH,
    size: 10,
    opacity: 100,
    hardness: 98,
    spacing: 25,
    availableSettings: [ "color", "size", "hardness", "opacity", "spacing" ],
    type: tool_types.STROKE,
    continuous: true,
    image: null
  } as Tool,
  ERASER: {
    name: tool_list.ERASER,
    size: 20,
    opacity: 100,
    hardness: 98,
    spacing: 25,
    availableSettings: [ "size", "opacity", "spacing" ],
    type: tool_types.STROKE,
    continuous: true,
    image: null
  } as Tool,
  FILL: {
    name: tool_list.FILL,
    size: 100,
    opacity: 100,
    hardness: 98,
    spacing: 0,
    availableSettings: [ "color" ],
    type: tool_types.POINT,
    continuous: false
  }
  // CURVE: {name: tool_list.CURVE}
}

function setWithDefaults(newSettings, defaultSettings) {
  for (const setting of Object.keys(defaultSettings[newSettings.name])) {
    this[setting] = defaultSettings[newSettings.name][setting]
  }

  for (const setting of Object.keys(newSettings)) {
    this[setting] = newSettings[setting]
  }
}

export class Tool implements ITool {
  name: ToolName
  size: number
  opacity: number
  hardness: number
  spacing: number
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean

  constructor(settings: Partial<ITool>) {
    setWithDefaults.call(this, settings, toolDefaults)
  }
}

export const tools = {
  PEN: new Tool({ name: tool_list.PEN }),
  BRUSH: new Tool({ name: tool_list.BRUSH }),
  ERASER: new Tool({ name: tool_list.ERASER }),
  FILL: new Tool({ name: tool_list.FILL }),
}