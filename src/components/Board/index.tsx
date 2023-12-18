import './styles.css'

import { useEffect, useRef } from 'react'

import Panel from '../Panel'
import Container from '../Container'
import { DrawCanvas } from '../DrawCanvas'

import useUIState from '../../hooks/useUIState'

import { useToolStore } from '../../stores/ToolStore'
import { useLayerStore } from '../../stores/LayerStore'

import { DrawingManager } from './drawingManager'

import { throttle, initializeCanvas } from '../../utils'

function _Board() {
  const boardRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
  const {  currentUIInteraction } = useUIState(DrawingManager.endInteraction, throttle(DrawingManager.undo))
  const currentLayer = useLayerStore.use.currentLayer()
  const currentTool = useToolStore.use.currentTool()

  useEffect(() => {
    DrawingManager.currentTool = currentTool
  }, [currentTool])

  useEffect(() => {
    DrawingManager.currentLayer = currentLayer
  }, [currentLayer])

  useEffect(() => {
    const rect = boardRef.current.parentElement!.getBoundingClientRect()

    const context = initializeCanvas(boardRef.current, rect.width, rect.height, { desynchronized: true, resize: true })

    if (!context) {
      throw new Error("WebGL2 is not supported")
    }

    DrawingManager.gl = context
    DrawingManager.canvasRef = boardRef

    DrawingManager.init()
    DrawingManager.loop(currentUIInteraction)
  }, [])

  return (
    <Container className="grow">
      <Panel className="flex relative w-full h-full">
        <div key={`draw_canvas`} className="absolute w-full h-full" style={{ zIndex: 5 }}>
          <DrawCanvas ref={boardRef} />
        </div>
        <div className='absolute w-full h-full canvas_separator'/>
      </Panel>
    </Container>
  )
}

export const Board = _Board
