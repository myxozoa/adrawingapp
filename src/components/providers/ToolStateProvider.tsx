import { useState, useCallback, useEffect } from 'react'

import { ToolState } from '../../contexts/ToolState'

import { tools, tool_list } from '../../constants'
import { ToolName, Tool } from '../../types'

function ToolStateProvider({ children }: { children: React.ReactNode }) {
  const [currentTool, setCurrentToolState] = useState(tools[tool_list.PEN])
  const [toolSize, setToolSize] = useState(currentTool.size!)
  const [toolHardness, setToolHardness] = useState(currentTool.hardness!)
  const [toolOpacity, setToolOpacity] = useState(currentTool.opacity!)
  const [toolSpacing, setToolSpacing] = useState(currentTool.spacing)

  const toolStateFunctions: Record<keyof Tool, React.SetStateAction<any>> = {
    size: setToolSize,
    hardness: setToolHardness,
    opacity: setToolOpacity,
    spacing: setToolSpacing,
    image: (_image: HTMLImageElement) => currentTool.image = _image
  }

  useEffect(() => {
    setToolSize(currentTool.size!)
    setToolHardness(currentTool.hardness!)
    setToolOpacity(currentTool.opacity!)
    setToolSpacing(currentTool.spacing)
  }, [currentTool])

  const setCurrentTool = useCallback((name: ToolName) => {
    if (!name) {
      setCurrentToolState(tools[tool_list.PEN])
    } else {
      setCurrentToolState(tools[name])
    }
  }, [])

  const changeToolSetting = useCallback((newSettings: any) => {
    Object.keys(newSettings).forEach((setting) => {
      toolStateFunctions[setting](newSettings[setting])
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
        setCurrentTool,
        toolSpacing,
        setToolSpacing
        }}>
        {children}
      </ToolState.Provider>
  )
}

export default ToolStateProvider
