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
  const toolColorElement = <div key="tool_color_setting" className='h-full justify-center items-center tool_color'>
      <ColorPicker size={100} value={color} onChange={colorThrottled} />
    </div>

  const toolSizeElement = <div key="tool_size_setting" className='h-full flex flex-row justify-center items-center tool_size'>
      <label htmlFor="tool_size" className="pr-2 text-sm text-muted-foreground">Size</label>
      <Slider name="tool_size" className='w-28 mr-2' min={1} max={50} value={[toolSize]} onValueChange={toolSizeThrottled} />
    </div>

  const toolHardnessElement = <div key="tool_hardness_setting" className='h-full flex flex-row justify-center items-center tool_hardness'>
      <label htmlFor="tool_hardness" className="pr-2 text-sm text-muted-foreground">Hardness</label>
      <Slider name="tool_hardness" className='w-28 mr-2' min={1} max={98} value={[toolHardness]} onValueChange={toolHardnessThrottled} />
    </div>

  const toolFlowElement = <div key="tool_flow_setting" className='h-full flex flex-row justify-center items-center tool_flow'>
      <label htmlFor="tool_flow" className="pr-2 text-sm text-muted-foreground">Flow</label>
      <Slider name="tool_flow" className='w-28 mr-2' min={1} max={100} value={[toolFlow]} onValueChange={toolFlowThrottled} />
    </div>

  const toolSpacingElement = <div key="tool_spacing_setting" className='h-full flex flex-row justify-center items-center tool_spacing'>
    <label htmlFor="tool_spacing" className="pr-2 text-sm text-muted-foreground">Spacing</label>
    <Slider name="tool_spacing" className='w-28 mr-2' min={1} max={50} value={[toolSpacing]} onValueChange={toolSpacingThrottled} />
    </div>

  const elements: Record<keyof typeof currentTool, React.ReactNode> = {
    size: toolSizeElement,
    hardness: toolHardnessElement,
    opacity: toolFlowElement,
    spacing: toolSpacingElement,
    // color: toolColorElement
  }

  return (
    <Container className="h-15">
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
