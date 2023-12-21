import { create } from "zustand"
import { AvailableTools, Tool, ToolName } from "@/types"

import { createSelectors } from "@/stores/selectors"

import { tool_list } from "@/constants"

import { Brush } from "@/objects/Brush"
import { Eraser } from "@/objects/Eraser"
import { Fill } from "@/objects/Fill"
import { Pen } from "@/objects/Pen"
import { Eyedropper } from "@/objects/Eyedropper"

export const tools: Record<ToolName, AvailableTools> = {
  PEN: new Pen(),
  BRUSH: new Brush(),
  ERASER: new Eraser(),
  FILL: new Fill(),
  EYEDROPPER: new Eyedropper(),
}

type State = {
  currentTool: Tool
}

type Action = {
  changeToolSetting: (newSettings: any) => void
  setCurrentTool: (name: ToolName) => void
}

const useToolStoreBase = create<State & Action>((set) => ({
  currentTool: tools[tool_list.BRUSH],
  changeToolSetting: (newSettings: any) =>
    set((state) => {
      const _state = { ...state }
      Object.keys(newSettings).forEach((setting) => {
        _state.currentTool[setting] = newSettings[setting]
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
