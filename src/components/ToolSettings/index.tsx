import { useContext, useRef, useEffect, useCallback } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'
import ColorPicker from '../ColorPicker'

import { ToolState } from '../../contexts/ToolState'
import { MainState } from '../../contexts/MainState'

import { throttle, initializeCanvas, rgbToHex } from '../../utils'

import { toolPreviewSize } from '../../constants'
import { ColorArray } from '../../types'

const jitterAlpha = (context: CanvasRenderingContext2D, width: number, height: number, amount: number) => {
  const imageData = context.getImageData(0, 0, width, height)

  for (let i = 0; i < imageData.data.length; i += 4) {

    const randomVariation = Math.floor(Math.random() * (amount)) - (amount - 1);

    if (imageData.data[i + 3] > 1) {
      imageData.data[i + 3] = Math.round(imageData.data[i + 3] + randomVariation)
    }
  }

  context.putImageData(imageData, 0, 0)
}

const radialFeather = (context: CanvasRenderingContext2D, size: number, hardness: number, width: number, height: number) => {
  const x = Math.floor(toolPreviewSize / 2)
  const y = Math.floor(toolPreviewSize / 2)
  const innerRadius = Math.min(Math.floor((hardness / 100) * size), size - 1)
  const radius = size
  
  context.save()
  const gradient = context.createRadialGradient(x, y, innerRadius, x, y, radius)
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 1)')

  context.arc(x, y, radius, 0, 2 * Math.PI)

  context.fillStyle = gradient
  context.globalCompositeOperation = 'destination-out'
  context.fillRect(0, 0, width, height)
  context.restore()
}

const drawBrushImage = (context: CanvasRenderingContext2D, size: number, hardness: number, color: ColorArray) => {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height)

  context.fillStyle = rgbToHex(color)

  context.fillRect(0, 0, context.canvas.width, context.canvas.height)

  radialFeather(context, size, hardness, context.canvas.width, context.canvas.height)

  jitterAlpha(context, context.canvas.width, context.canvas.height, 3)
}

function ToolSettings() {
  const previewCanvasRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
  const {
    currentTool,
    changeToolSetting,
    toolSize,
    toolHardness,
    toolOpacity,
    toolSpacing
  } = useContext(ToolState)

  const { color, changeSetting } = useContext(MainState)

  useEffect(() => {
    initializeCanvas(previewCanvasRef.current, toolPreviewSize, toolPreviewSize)
  }, [previewCanvasRef.current])

  useEffect(() => {
    if (previewCanvasRef.current) {
      const context = previewCanvasRef.current.getContext('2d') as CanvasRenderingContext2D

      drawBrushImage(context, toolSize, toolHardness, color)
  
      changeToolSetting({ image: previewCanvasRef.current })
    }
  }, [currentTool, toolSize, toolHardness, toolOpacity, color])

  const colorHandler = (value: ColorArray) => {
    changeSetting({ color: value })
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
      <input type="range" id="tool_hardness" name="tool_hardness" min="1" max="100" value={toolHardness} onChange={toolHardnessThrottled} />
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
