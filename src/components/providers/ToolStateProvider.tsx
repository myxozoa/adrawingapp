import { useState } from 'react'

import { ToolState } from '../../contexts/ToolState'

import { tools, tool_list } from '../../constants'
import { ToolName, Tool } from '../../types'

function ToolStateProvider({ children }: { children: React.ReactNode }) {
  const [currentTool, setCurrentToolState] = useState(tools[tool_list.PEN])
  // const [tools, setTools] = useState(_tools)

  const setCurrentTool = (name: ToolName) => {
    if (currentTool.name !== name) {
      setCurrentToolState(tools[name])
    } else {
      setCurrentToolState(tools[tool_list.PEN])
    }
  }

  const changeToolSetting = (newSettings: Partial<Tool>) => {
    Object.keys(newSettings).forEach((setting) => {
        currentTool[setting] = newSettings[setting]
    })
  }

  return (
      <ToolState.Provider value={{ tools, currentTool, setCurrentTool, changeToolSetting }}>
        {children}
      </ToolState.Provider>
  )
}

export default ToolStateProvider
