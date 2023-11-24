import { createContext } from "react"

import { tools, tool_list } from '../constants'
import { ToolState as ToolStateType } from "../types"

const defaultValue: ToolStateType = { tools, currentTool: tools[tool_list.PEN] } as ToolStateType

export const ToolState = createContext(defaultValue)