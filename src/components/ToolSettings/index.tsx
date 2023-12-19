import { useEffect, useState, useCallback } from 'react'

import Panel from '../Panel'
import Container from '../Container'
import ColorPicker from '../ColorPicker'
import { ToolPreview } from '../ToolPreview'

import { useToolStore } from '../../stores/ToolStore'
import { useMainStore } from '../../stores/MainStore'

import { throttle } from '../../utils'

import { ColorArray } from '../../types'

import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'

function _ToolSettings() {
  const currentTool = useToolStore.use.currentTool()
  const changeCurrentToolSetting = useToolStore.use.changeToolSetting()

  const [toolSize, setToolSize] = useState(currentTool.size)
  const [toolHardness, setToolHardness] = useState(currentTool.hardness)
  const [toolFlow, setToolFlow] = useState(currentTool.opacity)
  const [toolSpacing, setToolSpacing] = useState(currentTool.spacing)

  const toolStateFunctions: Record<keyof Tool, React.SetStateAction<any>> = {
    size: setToolSize,
    hardness: setToolHardness,
    opacity: setToolFlow,
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

  useEffect(() => {
    setToolSize(currentTool.size)
    setToolHardness(currentTool.hardness)
    setToolFlow(currentTool.opacity)
    setToolSpacing(currentTool.spacing)
  }, [currentTool])

  const colorHandler = (value: ColorArray) => {
    setColor(value)
  }

  const colorThrottled = useCallback(throttle(colorHandler, 16), [currentTool])

  const toolSizeHandler = (value: number) => {
    changeToolSetting({ size: Math.round(value) })
  }

  const toolSizeThrottled = useCallback(throttle(toolSizeHandler, 16), [currentTool])

  const toolHardnessHandler = (value: number) => {
    changeToolSetting({ hardness: Math.round(value) })
  }

  const toolHardnessThrottled = useCallback(throttle(toolHardnessHandler, 16), [currentTool])

  const toolFlowHandler = (value: number) => {
    changeToolSetting({ opacity: Math.round(value) })
  }

  const toolFlowThrottled = useCallback(throttle(toolFlowHandler, 16), [currentTool])

  const toolSpacingHandler = (value: number) => {
    changeToolSetting({ spacing: value })
  }

  const toolSpacingThrottled = useCallback(throttle(toolSpacingHandler, 16), [currentTool])

  // TODO: componentify
  const toolColorElement = <div key="tool_color_setting" className='w-28 h-full justify-center items-center tool_color'>
      <ColorPicker size={100} value={color} onChange={colorThrottled} />
    </div>

  const toolSizeElement = <div key="tool_size_setting" className='w-28 h-full flex flex-col justify-center items-center tool_size'>
      {/* <input className='w-28' type="range" id="tool_size" name="tool_size" min="1" max="50" value={toolSize} onChange={toolSizeThrottled} /> */}
      <Slider name="tool_size" min={1} max={50} value={[toolSize]} onValueChange={toolSizeThrottled} />
      <label htmlFor="tool_size" className="text-sm text-muted-foreground">Size</label>
    </div>

  const toolHardnessElement = <div key="tool_hardness_setting" className='w-28 h-full flex flex-col justify-center items-center tool_hardness'>
      {/* <input className='w-28' type="range" id="tool_hardness" name="tool_hardness" min="1" max="98" value={toolHardness} onChange={toolHardnessThrottled} /> */}
      <Slider name="tool_hardness" min={1} max={98} value={[toolHardness]} onValueChange={toolHardnessThrottled} />

      <label htmlFor="tool_hardness" className="text-sm text-muted-foreground">Hardness</label>
    </div>

  const toolFlowElement = <div key="tool_flow_setting" className='w-28 h-full flex flex-col justify-center items-center tool_flow'>
      {/* <input className='w-28' type="range" id="tool_opacity" name="tool_opacity" min="1" max="100" value={toolFlow} onChange={toolFlowThrottled} /> */}
      <Slider name="tool_flow" min={1} max={100} value={[toolFlow]} onValueChange={toolFlowThrottled} />
      
      <label htmlFor="tool_flow" className="text-sm text-muted-foreground">Flow</label>
    </div>

  const toolSpacingElement = <div key="tool_spacing_setting" className='w-28 h-full flex flex-col justify-center items-center tool_spacing'>
    {/* <input className='w-28' type="range" id="tool_spacing" name="tool_spacing" min="1" max="50" value={toolSpacing} onChange={toolSpacingThrottled} /> */}
    <Slider name="tool_spacing" min={1} max={50} value={[toolSpacing]} onValueChange={toolSpacingThrottled} />

    <label htmlFor="tool_spacing" className="text-sm text-muted-foreground">Spacing</label>
    </div>

  const elements: Record<keyof typeof currentTool, React.ReactNode> = {
    size: toolSizeElement,
    hardness: toolHardnessElement,
    opacity: toolFlowElement,
    spacing: toolSpacingElement,
    color: toolColorElement
  }

  return (
    <Container className="h-25">
      <Panel className='w-full'>
        <div className='flex flex-row'>
          <ToolPreview />
          {currentTool.availableSettings.map((setting) => {
            return (
              <div key={"tool_settings" + setting} className="pr-4 flex flex-row">
                {elements[setting]}
                <Separator orientation='vertical'/>
              </div>
            )
          })}
        </div>
      </Panel>
    </Container>
  )
}

export const ToolSettings = _ToolSettings
