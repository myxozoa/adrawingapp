import { useState, useCallback } from 'react'

import { ToolState } from '../../contexts/ToolState'

import { tools, tool_list } from '../../constants'
import { ToolName, Tool } from '../../types'
import { rgbToHex } from '../../utils'

function ToolStateProvider({ children }: { children: React.ReactNode }) {
  const [currentTool, setCurrentToolState] = useState(tools[tool_list.PEN])
  const [toolSize, setToolSize] = useState(currentTool.size)
  const [toolHardness, setToolHardness] = useState(currentTool.hardness)
  const [toolOpacity, setToolOpacity] = useState(currentTool.opacity)
  const [toolColor, setToolColor] = useState(rgbToHex(currentTool.color))

  const setCurrentTool = useCallback((name: ToolName) => {
    if (!name) {
      setCurrentToolState(tools[tool_list.PEN])
    } else {
      setCurrentToolState(tools[name])
    }
  }, [])

  const changeToolSetting = useCallback((newSettings: Partial<Tool>) => {
    Object.keys(newSettings).forEach((setting) => {
        currentTool[setting] = newSettings[setting]
    })
  }, [currentTool])

  return (
      <ToolState.Provider value={{
        tools,
        currentTool,
        changeToolSetting,
        toolSize,
        setToolSize,
        toolHardness,
        setToolHardness,
        toolOpacity,
        setToolOpacity,
        toolColor,
        setToolColor,
        setCurrentTool
        }}>
        {children}
      </ToolState.Provider>
  )
}

export default ToolStateProvider
