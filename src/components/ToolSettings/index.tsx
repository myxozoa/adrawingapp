import { useState, useContext, useRef, useEffect } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'

import { ToolState } from '../../contexts/ToolState'

import { throttle, rgbToHex, hexToRgb } from '../../utils'

const previewSize = 100

function ToolSettings() {
  const previewCanvasRef = useRef() as React.RefObject<HTMLCanvasElement>
  const { currentTool, changeToolSetting } = useContext(ToolState)
  const [toolSize, setToolSize] = useState(currentTool.size)
  const [toolHardness, setToolHardness] = useState(currentTool.hardness || 100)
  const [toolOpacity, setToolOpacity] = useState(currentTool.opacity)
  const [toolColor, setToolColor] = useState(rgbToHex(currentTool.color))

  useEffect(() => {
    setToolSize(currentTool.size)
    setToolHardness(currentTool.hardness || 100)
    setToolOpacity(currentTool.opacity)
    setToolColor(rgbToHex(currentTool.color))
  }, [currentTool])

  useEffect(() => {
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

    changeToolSetting(currentTool.name, { image, size: toolSize, hardness: toolHardness, opacity: toolOpacity, color: hexToRgb(toolColor) })
  }, [currentTool, toolSize, toolHardness, toolOpacity, toolColor])

  return (
    <Container className="tool_settings_container">
      <Panel>
        <div className='tool_settings'>
          <canvas className='tool_preview_canvas' ref={previewCanvasRef} width={previewSize} height={previewSize} />
          <div className='tool_setting tool_color'>
            <input type="color" id="tool_color" name="tool_color" value={toolColor} onChange={(e) => throttle(setToolColor(e.target.value), 100)} />
            <label htmlFor="tool_color">Color</label>
          </div>
          <div className='tool_setting tool_size'>
            <input type="range" id="tool_size" name="tool_size" min="5" max="50" step={1} value={toolSize} onChange={(e) => throttle(setToolSize(+e.target.value), 100)} />
            <label htmlFor="tool_size">Size</label>
          </div>
          <div className='tool_setting tool_hardness'>
            <input type="range" id="tool_hardness" name="tool_hardness" min="1" max="100" step={1} value={toolHardness} onChange={(e) => throttle(setToolHardness(+e.target.value), 100)} />
            <label htmlFor="tool_hardness">Hardness</label>
          </div>
          <div className='tool_setting tool_opacity'>
            <input type="range" id="tool_opacity" name="tool_opacity" min="1" max="100" step={1} value={toolOpacity} onChange={(e) => throttle(setToolOpacity(+e.target.value), 100)} />
            <label htmlFor="tool_opacity">Opacity</label>
          </div>
        </div>
      </Panel>
    </Container>
  )
}

export default ToolSettings
