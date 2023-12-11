import { useContext, useEffect, memo } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'
import { DrawCanvas } from '../DrawCanvas'

import { LayerState } from "../../contexts/LayerState"
import { ToolState } from '../../contexts/ToolState'
import { MainState } from '../../contexts/MainState'
import useUIState from '../../hooks/useUIState'

import { DrawingManager } from './drawingManager'

import { throttle } from '../../utils'

function _Board() {
  const {  currentUIInteraction } = useUIState(DrawingManager.endInteraction, throttle(DrawingManager.undo))
  const { currentLayer } = useContext(LayerState)
  const { currentTool } = useContext(ToolState)
  const _MainState = useContext(MainState)

  DrawingManager.main = _MainState

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
    <Container className="board">
      <Panel className="canvases">
        <div key={`draw_canvas`} className="layer_canvas_container" style={{ zIndex: 5 }}>
          <DrawCanvas ref={currentLayer.canvasRef} />
        </div>
        <div className='layer_canvas_container canvas_separator'/>
      </Panel>
    </Container>
  )
}

export const Board = memo(_Board)
