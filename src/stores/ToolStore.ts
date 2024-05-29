import { create } from "zustand"
import type { AvailableTools, ToolName, WithoutMethods, IBrush, IEyedropper, IFill, ITool, IEraser } from "@/types"

import { createSelectors } from "@/stores/selectors"

import { tool_list, tool_types } from "@/constants"

import { Brush } from "@/objects/Brush"
import { Eraser } from "@/objects/Eraser"
import { Fill } from "@/objects/Fill"
// import { Pen } from "@/objects/Pen"
import { Eyedropper } from "@/objects/Eyedropper"

interface ToolMap {
  // PEN: IPen
  BRUSH: IBrush
  ERASER: IEraser
  FILL: IFill
  EYEDROPPER: IEyedropper
}

type ToolSettings = {
  [K in ToolName]: K extends keyof ToolMap ? ToolMap[K]["settings"] : never
}

type Tools = {
  [K in ToolName]: K extends keyof ToolMap ? ToolMap[K] : never
}

type ToolProperties = {
  [K in ToolName]: K extends keyof ToolMap ? WithoutMethods<ITool> : never
}

export const toolProperties: ToolProperties = {
  // PEN: {
  //   availableSettings: ["size"],
  //   type: tool_types.STROKE,
  //   continuous: true,
  //   numberOfPoints: 8,
  // },
  BRUSH: {
    availableSettings: ["size", "hardness", "opacity", "flow", "spacing"],
    type: tool_types.STROKE,
    continuous: true,
    numberOfPoints: 8,
  },
  ERASER: {
    availableSettings: ["size", "hardness", "opacity", "flow", "spacing"],
    type: tool_types.STROKE,
    continuous: true,
    numberOfPoints: 8,
  },
  FILL: {
    availableSettings: [],
    type: tool_types.POINT,
    continuous: false,
    numberOfPoints: 1,
  },
  EYEDROPPER: {
    availableSettings: ["sampleSize"],
    type: tool_types.POINT,
    continuous: false,
    numberOfPoints: 1,
  },
}

export const toolDefaults: ToolSettings = {
  // PEN: {
  //   size: 10,
  //   opacity: 100,
  // },
  BRUSH: {
    size: 10,
    sizePressure: true,
    opacity: 100,
    opacityPressure: false,
    flow: 100,
    flowPressure: false,
    hardness: 100,
    hardnessPressure: false,
    spacing: 5,
  },
  ERASER: {
    size: 20,
    sizePressure: false,
    opacity: 100,
    opacityPressure: false,
    flow: 100,
    flowPressure: false,
    hardness: 100,
    hardnessPressure: false,
    spacing: 5,
  },
  FILL: {
    flood: true,
  },
  EYEDROPPER: {
    sampleSize: 1,
  },
}

export const tools: Tools = {
  // PEN: new Pen(),
  BRUSH: new Brush(),
  ERASER: new Eraser(),
  FILL: new Fill(),
  EYEDROPPER: new Eyedropper(),
}

interface State extends ToolSettings {
  currentTool: AvailableTools
}

interface Action {
  changeToolSetting: <T extends Partial<AvailableTools["settings"]>>(newSettings: T) => void
  setCurrentTool: (name: ToolName) => void
}

type Keys<T> = (keyof T)[]

function objectKeys<T extends object>(obj: T): Keys<T> {
  return Object.keys(obj) as Keys<T>
}

const useToolStoreBase = create<State & Action>((set) => ({
  ...toolDefaults,
  currentTool: tools[tool_list.BRUSH],
  changeToolSetting: <T extends Partial<AvailableTools["settings"]>>(newSettings: T) =>
    set((state) => {
      const _state = { ...state, [state.currentTool.name]: { ...state.currentTool.settings, ...newSettings } }
      objectKeys(newSettings).forEach((setting) => {
        // @ts-expect-error this is better than it was before at least
        _state.currentTool.settings[setting] = newSettings[setting]
      })
      return _state
    }),
  setCurrentTool: (name: ToolName) =>
    set(() => {
      if (!name) {
        return { currentTool: tools[tool_list.BRUSH] }
      } else {
        return { currentTool: tools[name] }
      }
    }),
}))

export const useToolStore = createSelectors(useToolStoreBase)
