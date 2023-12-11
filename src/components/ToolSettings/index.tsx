import { useState, useCallback } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'
import ColorPicker from '../ColorPicker'
import { ToolPreview } from '../ToolPreview'

import { useToolStore } from '../../stores/ToolStore'
import { useMainStore } from '../../stores/MainStore'

import { throttle } from '../../utils'

import { ColorArray } from '../../types'

function _ToolSettings() {
  const currentTool = useToolStore.use.currentTool()
  const changeCurrentToolSetting = useToolStore.use.changeToolSetting()

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

  const changeToolSetting = useCallback((newSettings: any) => {
    Object.keys(newSettings).forEach((setting) => {
      toolStateFunctions[setting](newSettings[setting])
    })
    
    changeCurrentToolSetting(newSettings)
  }, [currentTool])

  const color = useMainStore.use.color()
  const setColor = useMainStore.use.setColor()

  const colorHandler = (value: ColorArray) => {
    setColor(value)
  }

  const colorThrottled = useCallback(throttle(colorHandler, 16), [currentTool])

  const toolSizeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeToolSetting({ size: Math.round(Number(event.target.value)) })
  }

  const toolSizeThrottled = useCallback(throttle(toolSizeHandler, 16), [currentTool])

  const toolHardnessHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeToolSetting({ hardness: Math.round(Number(event.target.value)) })
  }

  const toolHardnessThrottled = useCallback(throttle(toolHardnessHandler, 16), [currentTool])

  const toolOpacityHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeToolSetting({ opacity: Math.round(Number(event.target.value)) })
  }

  const toolOpacityThrottled = useCallback(throttle(toolOpacityHandler, 16), [currentTool])

  const toolSpacingHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeToolSetting({ spacing: event.target.value })
  }

  const toolSpacingThrottled = useCallback(throttle(toolSpacingHandler, 16), [currentTool])

  // TODO: componentify
  const toolColorElement = <div key="tool_color_setting" className='tool_setting tool_color'>
      <ColorPicker size={100} value={color} onChange={colorThrottled} />
    </div>

  const toolSizeElement = <div key="tool_size_setting" className='tool_setting tool_size'>
      <input type="range" id="tool_size" name="tool_size" min="5" max="50" value={toolSize} onChange={toolSizeThrottled} />
      <label htmlFor="tool_size">Size</label>
    </div>

  const toolHardnessElement = <div key="tool_hardness_setting" className='tool_setting tool_hardness'>
      <input type="range" id="tool_hardness" name="tool_hardness" min="1" max="98" value={toolHardness} onChange={toolHardnessThrottled} />
      <label htmlFor="tool_hardness">Hardness</label>
    </div>

  const toolOpacityElement = <div key="tool_opacity_setting" className='tool_setting tool_opacity'>
      <input type="range" id="tool_opacity" name="tool_opacity" min="1" max="100" value={toolOpacity} onChange={toolOpacityThrottled} />
      <label htmlFor="tool_opacity">Opacity</label>
    </div>

  const toolSpacingElement = <div key="tool_spacing_setting" className='tool_setting tool_spacing'>
    <input type="range" id="tool_spacing" name="tool_spacing" min="5" max="100" value={toolSpacing} onChange={toolSpacingThrottled} />
    <label htmlFor="tool_spacing">Spacing</label>
    </div>

  const elements: Record<keyof typeof currentTool, React.ReactNode> = {
    size: toolSizeElement,
    hardness: toolHardnessElement,
    opacity: toolOpacityElement,
    spacing: toolSpacingElement,
    color: toolColorElement
  }

  return (
    <Container className="tool_settings_container">
      <Panel>
        <div className='tool_settings'>
          <ToolPreview />
          {currentTool.availableSettings.map((setting) => {
            return elements[setting]
          })}
        </div>
      </Panel>
    </Container>
  )
}

export const ToolSettings = _ToolSettings
