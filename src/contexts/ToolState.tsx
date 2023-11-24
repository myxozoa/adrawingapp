import { createContext } from "react"

import { tools, tool_list } from '../constants'

const defaultValue = { tools, currentTool: tools[tool_list.PEN], setCurrentTool: () => {}, changeToolSetting: () => {} }

export const ToolState = createContext(defaultValue)