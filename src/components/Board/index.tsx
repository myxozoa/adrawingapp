import { useEffect } from 'react'

import Panel from '../Panel'
import Container from '../Container'
import { DrawCanvas } from '../DrawCanvas'

import useUIState from '../../hooks/useUIState'

import { useToolStore } from '../../stores/ToolStore'
import { useLayerStore } from '../../stores/LayerStore'

import { DrawingManager } from './drawingManager'

import { throttle } from '../../utils'

function _Board() {
  const {  currentUIInteraction } = useUIState(DrawingManager.endInteraction, throttle(DrawingManager.undo))
  const currentLayer = useLayerStore.use.currentLayer()

  const currentTool = useToolStore.use.currentTool()

  useEffect(() => {
    DrawingManager.currentTool = currentTool
  }, [currentTool])

  useEffect(() => {
    DrawingManager.context = currentLayer.canvasRef.current.getContext("2d") as CanvasRenderingContext2D
    DrawingManager.currentLayer = currentLayer
  }, [currentLayer])

  useEffect(() => {
    DrawingManager.interactLoop(currentUIInteraction);
  }, [])

  return (
    <Container className="grow">
      <Panel className="flex relative w-full h-full">
        <div key={`draw_canvas`} className="absolute w-full h-full" style={{ zIndex: 5 }}>
          <DrawCanvas ref={currentLayer.canvasRef} />
        </div>
        <div className='absolute w-full h-full canvas_separator'/>
      </Panel>
    </Container>
  )
}

export const Board = _Board
