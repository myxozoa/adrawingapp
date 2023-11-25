import { useContext, useRef, useEffect, useCallback } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'

import { ToolState } from '../../contexts/ToolState'

import { throttle } from '../../utils'

import { toolPreviewSize } from '../../constants'

function ToolSettings() {
  const previewCanvasRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
  const {
    currentTool,
    changeToolSetting,
    toolSize,
    toolHardness,
    toolOpacity,
    toolColor
  } = useContext(ToolState)

  useEffect(() => {
    if (previewCanvasRef.current) {
      const context = previewCanvasRef.current.getContext('2d') as CanvasRenderingContext2D
      context.reset()
  
      const x = Math.floor(toolPreviewSize / 2)
      const y = Math.floor(toolPreviewSize / 2)
      const innerRadius = Math.min(Math.floor((toolHardness / 100) * toolSize), toolSize - 1)
      const radius = toolSize
  
      const gradient = context.createRadialGradient(x, y, innerRadius, x, y, radius)
      gradient.addColorStop(0, currentTool.getCanvasColor(true))
      gradient.addColorStop(1, currentTool.getCanvasColor(true, true))
  
      context.arc(x, y, radius, 0, 2 * Math.PI)
  
      context.fillStyle = gradient
      context.fill()
  
      const imageData = previewCanvasRef.current.toDataURL('image/png', 1)
      const image = new Image()
      image.src = imageData
  
      changeToolSetting({ image })
    }
  }, [currentTool, toolSize, toolHardness, toolOpacity, toolColor])

  const toolColorHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeToolSetting({ color: event.target.value })
  }

  const toolColorThrottled = useCallback(throttle(toolColorHandler, 33), [currentTool])

  const toolSizeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeToolSetting({ size: Number(event.target.value) })
  }

  const toolSizeThrottled = useCallback(throttle(toolSizeHandler, 33), [currentTool])

  const toolHardnessHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeToolSetting({ hardness: Number(event.target.value) })
  }

  const toolHardnessThrottled = useCallback(throttle(toolHardnessHandler, 33), [currentTool])

  const toolOpacityHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    changeToolSetting({ opacity: Number(event.target.value) })
  }

  const toolOpacityThrottled = useCallback(throttle(toolOpacityHandler, 33), [currentTool])

  // TODO: componentify
  const toolColorElement = <div key="tool_color_setting" className='tool_setting tool_color'>
      <input type="color" id="tool_color" name="tool_color" value={toolColor} onChange={toolColorThrottled} />
      <label htmlFor="tool_color">Color</label>
    </div>

  const toolSizeElement = <div key="tool_size_setting" className='tool_setting tool_size'>
      <input type="range" id="tool_size" name="tool_size" min="5" max="50" step={1} value={toolSize} onChange={toolSizeThrottled} />
      <label htmlFor="tool_size">Size</label>
    </div>

  const toolHardnessElement = <div key="tool_hardness_setting" className='tool_setting tool_hardness'>
      <input type="range" id="tool_hardness" name="tool_hardness" min="1" max="100" step={1} value={toolHardness} onChange={toolHardnessThrottled} />
      <label htmlFor="tool_hardness">Hardness</label>
    </div>

  const toolOpacityElement = <div key="tool_opacity_setting" className='tool_setting tool_opacity'>
      <input type="range" id="tool_opacity" name="tool_opacity" min="1" max="100" step={1} value={toolOpacity} onChange={toolOpacityThrottled} />
      <label htmlFor="tool_opacity">Opacity</label>
    </div>

  const elements: Record<keyof typeof currentTool, React.ReactNode> = {
    size: toolSizeElement,
    color: toolColorElement,
    hardness: toolHardnessElement,
    opacity: toolOpacityElement
  }

  return (
    <Container className="tool_settings_container">
      <Panel>
        <div className='tool_settings'>
          <canvas className='tool_preview_canvas' ref={previewCanvasRef} width={toolPreviewSize} height={toolPreviewSize} />
          {currentTool.availableSettings.map((setting) => {
            return elements[setting]
          })}
        </div>
      </Panel>
    </Container>
  )
}

export default ToolSettings
