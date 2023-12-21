import { AvailableTools, IBrush, IFill, IPen, ITool, ToolName, ToolSetting, ToolType } from "../types"

import { tool_list, tool_types } from "../constants"

type ToolMap = {
  PEN: IPen,
  BRUSH: IBrush,
  ERASER: IBrush,
  FILL: IFill
}

type ToolDefaults = {
  [K in ToolName]: K extends keyof ToolMap ? ToolMap[K] : never;
}

export const toolDefaults: ToolDefaults = {
  PEN: {
    name: tool_list.PEN,
    size: 10,
    opacity: 100,
    availableSettings: [ "color", "size" ],
    type: tool_types.STROKE,
    continuous: true
  },
  BRUSH: {
    name: tool_list.BRUSH,
    size: 10,
    opacity: 100,
    flow: 100,
    hardness: 98,
    spacing: 5,
    availableSettings: [ "color", "size", "hardness", "flow", "spacing" ],
    type: tool_types.STROKE,
    continuous: true
  },
  ERASER: {
    name: tool_list.ERASER,
    size: 20,
    opacity: 100,
    flow: 100,
    hardness: 98,
    spacing: 25,
    availableSettings: [ "size", "flow", "spacing" ],
    type: tool_types.STROKE,
    continuous: true,
  },
  FILL: {
    name: tool_list.FILL,
    flood: true,
    availableSettings: [ "color" ],
    type: tool_types.POINT,
    continuous: false
  }
}

export function setWithDefaults<T extends AvailableTools>(newSettings: Partial<T>, defaultSettings: T) {
  for (const setting of Object.keys(defaultSettings)) {
    this[setting] = defaultSettings[setting]
  }

  for (const setting of Object.keys(newSettings)) {
    this[setting] = newSettings[setting]
  }
}

export class Tool implements ITool {
  name: ToolName
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean

  use = (gl: WebGL2RenderingContext) => {
    gl.useProgram(this.program)
    if (this.VBO) gl.bindBuffer(gl.ARRAY_BUFFER, this.VBO)
    if (this.VAO) gl.bindVertexArray(this.VAO)
  }
}
