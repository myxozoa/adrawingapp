import { useEffect, useState } from 'react'

import { ToolState } from '../../contexts/ToolState'

import { tools as _tools, tool_list } from '../../constants'

function ToolStateProvider({ children }) {
  const [currentTool, _setCurrentTool] = useState(_tools[tool_list.PEN])
  const [tools, setTools] = useState(_tools)

  const setCurrentTool = (name) => {
    if (currentTool.name !== name) {
      _setCurrentTool(tools[name])
    } else {
      _setCurrentTool(tools[tool_list.PEN])
    }
  }

  const changeToolSetting = (name, newSettings) => {
    Object.keys(newSettings).forEach(setting => {
      currentTool[setting] = newSettings[setting]
    })
  }

  useEffect(() => {
    
  }, [])

  return (
      <ToolState.Provider value={{ tools, currentTool, setCurrentTool, changeToolSetting }}>
        {children}
      </ToolState.Provider>
  )
}

export default ToolStateProvider
