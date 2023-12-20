import { useEffect, useState, useCallback } from 'react'

import Panel from '../Panel'
import Container from '../Container'
// import ColorPicker from '../ColorPicker'
import { ToolPreview } from '../ToolPreview'

import { useToolStore } from '../../stores/ToolStore'
// import { useMainStore } from '../../stores/MainStore'

import { throttle } from '../../utils'

// import { ColorArray } from '../../types'

import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'

// const ToolColorSetting = () => {
//   const colorHandler = (value: ColorArray) => {
//     setColor(value)
//   }

//   const colorThrottled = useCallback(throttle(colorHandler, 16), [currentTool])

//   return (<div key="tool_color_setting" className='h-full justify-center items-center tool_color'>
//     <ColorPicker size={100} value={color} onChange={colorThrottled} />
//   </div>)
// }

const SliderSetting = (name: string, value: number, onValueChange: (value: any) => void, dependency: any, props: any) => {
  const handler = useCallback(throttle(onValueChange, 16), [dependency])

  return (<div key={`${name}_setting`} className='h-full flex flex-row justify-center items-center'>
    <label htmlFor={name} className="pr-2 text-sm text-muted-foreground">{name}</label>
    <Slider name={name} className='w-28 mr-4' {...props} value={[value]} onValueChange={handler} />
    <p className="text-sm text-muted-foreground mr-2 w-[3ch]">{value}</p>
  </div>)
}

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

  // const color = useMainStore.use.color()
  // const setColor = useMainStore.use.setColor()

  useEffect(() => {
    setToolSize(currentTool.size)
    setToolHardness(currentTool.hardness)
    setToolFlow(currentTool.opacity)
    setToolSpacing(currentTool.spacing)
  }, [currentTool])

  const elements: Record<keyof typeof currentTool, React.ReactNode> = {
    size: SliderSetting("Size", toolSize, (size) => changeToolSetting({ size }), currentTool, { min: 4, max: 50 }),
    hardness: SliderSetting("Hardness", toolHardness, (hardness) => changeToolSetting({ hardness }), currentTool, { min: 1, max: 100 }),
    opacity: SliderSetting("Flow", toolFlow, (opacity) => changeToolSetting({ opacity }), currentTool, { min: 1, max: 100 }),
    spacing: SliderSetting("Spacing", toolSpacing, (spacing) => changeToolSetting({ spacing }), currentTool, { min: 1, max: 50 }),
    // color: <ToolColorSetting />
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
