import { create } from "zustand"
import { AvailableTools, ToolName } from "@/types"

import { createSelectors } from "@/stores/selectors"

import { tool_list } from "@/constants"

import { Brush } from "@/objects/Brush"
import { Eraser } from "@/objects/Eraser"
import { Fill } from "@/objects/Fill"
import { Pen } from "@/objects/Pen"
import { Eyedropper } from "@/objects/Eyedropper"

interface ToolMap {
  PEN: Pen
  BRUSH: Brush
  ERASER: Eraser
  FILL: Fill
  EYEDROPPER: Eyedropper
}

type ToolDefaults = {
  [K in ToolName]: K extends keyof ToolMap ? ToolMap[K] : never
}

// @ts-expect-error: will reenable when eraser works
export const tools: ToolDefaults = {
  PEN: new Pen(),
  BRUSH: new Brush(),
  // ERASER: new Eraser(),
  FILL: new Fill(),
  EYEDROPPER: new Eyedropper(),
}

interface State {
  currentTool: AvailableTools
}

interface Action {
  changeToolSetting: (newSettings: any) => void
  setCurrentTool: (name: ToolName) => void
}

const useToolStoreBase = create<State & Action>((set) => ({
  currentTool: tools[tool_list.BRUSH],
  changeToolSetting: (newSettings: Partial<AvailableTools["settings"]>) =>
    set((state) => {
      const _state = { ...state }
      Object.keys(newSettings).forEach((setting) => {
        // @ts-expect-error spent too long on this
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        _state.currentTool.settings[setting] = newSettings[setting] // TODO: Maybe rearchitect to get better type safety
      })

      return _state
    }),
  setCurrentTool: (name: ToolName) =>
    set(() => {
      if (!name) {
        return { currentTool: tools[tool_list.PEN] }
      } else {
        return { currentTool: tools[name] }
      }
    }),
}))

export const useToolStore = createSelectors(useToolStoreBase)
