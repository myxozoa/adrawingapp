import { create } from 'zustand'
import { Tool, ToolName } from '../types'

import { createSelectors } from './selectors'

import { tool_list } from '../constants'

import { tools } from '../objects/Tool'

type State = {
  currentTool: Tool
}

type Action = {
  changeToolSetting: (newSettings: any) => void
  setCurrentTool: (name: ToolName) => void
}

const useToolStoreBase = create<State & Action>((set) => ({
  currentTool: tools[tool_list.PEN],
  changeToolSetting: (newSettings: any) => set((state) => {

    const _state = { ...state }
    Object.keys(newSettings).forEach((setting) => {
      _state.currentTool[setting] = newSettings[setting]
    })
  
    return _state
  }),
  setCurrentTool: (name: ToolName) => set(() => {
    if (!name) {
      return { currentTool: tools[tool_list.PEN] }
    } else {
      return { currentTool: tools[name] }
    }
  })
}))

export const useToolStore = createSelectors(useToolStoreBase)