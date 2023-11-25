import { useContext, useRef, useEffect, useCallback } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'

import { ToolState } from '../../contexts/ToolState'

import { throttle, hexToRgb } from '../../utils'

const previewSize = 100

function ToolSettings() {
  const previewCanvasRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
  const {
    currentTool,
    changeToolSetting,
    toolSize,
    setToolSize,
    toolHardness,
    setToolHardness,
    toolOpacity,
    setToolOpacity,
    toolColor,
    setToolColor
  } = useContext(ToolState)

  useEffect(() => {
    if (previewCanvasRef.current) {
      const context = previewCanvasRef.current.getContext('2d') as CanvasRenderingContext2D
      context.clearRect(0,0,previewSize,previewSize)
  
      const x = Math.floor(previewSize / 2)
      const y = Math.floor(previewSize / 2)
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
  
      changeToolSetting({ image, size: toolSize, hardness: toolHardness, opacity: toolOpacity, color: hexToRgb(toolColor) })
    }
  }, [currentTool, toolSize, toolHardness, toolOpacity, toolColor])

  const toolColorHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setToolColor(event.target.value)
  }

  const toolColorThrottled = useCallback(throttle(toolColorHandler, 33), [])

  const toolSizeHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setToolSize(+event.target.value)
  }

  const toolSizeThrottled = useCallback(throttle(toolSizeHandler, 33), [])

  const toolHardnessHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setToolHardness(+event.target.value)
  }

  const toolHardnessThrottled = useCallback(throttle(toolHardnessHandler, 33), [])

  const toolOpacityHandler = (event: React.ChangeEvent<HTMLInputElement>) => {
    setToolOpacity(+event.target.value)
  }

  const toolOpacityThrottled = useCallback(throttle(toolOpacityHandler, 33), [])

  return (
    <Container className="tool_settings_container">
      <Panel>
        <div className='tool_settings'>
          <canvas className='tool_preview_canvas' ref={previewCanvasRef} width={previewSize} height={previewSize} />
          <div className='tool_setting tool_color'>
            <input type="color" id="tool_color" name="tool_color" value={toolColor} onChange={toolColorThrottled} />
            <label htmlFor="tool_color">Color</label>
          </div>
          <div className='tool_setting tool_size'>
            <input type="range" id="tool_size" name="tool_size" min="5" max="50" step={1} value={toolSize} onChange={toolSizeThrottled} />
            <label htmlFor="tool_size">Size</label>
          </div>
          <div className='tool_setting tool_hardness'>
            <input type="range" id="tool_hardness" name="tool_hardness" min="1" max="100" step={1} value={toolHardness} onChange={toolHardnessThrottled} />
            <label htmlFor="tool_hardness">Hardness</label>
          </div>
          <div className='tool_setting tool_opacity'>
            <input type="range" id="tool_opacity" name="tool_opacity" min="1" max="100" step={1} value={toolOpacity} onChange={toolOpacityThrottled} />
            <label htmlFor="tool_opacity">Opacity</label>
          </div>
        </div>
      </Panel>
    </Container>
  )
}

export default ToolSettings
