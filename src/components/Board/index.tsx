import { useContext, useEffect } from 'react'

import './styles.css'
import Panel from '../Panel'
import Container from '../Container'
import { LayerCanvas } from '../LayerCanvas'

import { LayerState } from "../../contexts/LayerState"
import { ToolState } from '../../contexts/ToolState'
import useUIState from '../../hooks/useUIState'

import { DrawingManager } from './drawingManager'

import { throttle } from '../../utils'

function Board() {
  const {  currentUIInteraction } = useUIState(DrawingManager.endInteraction, throttle(DrawingManager.undo))
  const { layers, currentLayer } = useContext(LayerState)
  const { currentTool } = useContext(ToolState)

  useEffect(() => {
    DrawingManager.currentTool = currentTool
  }, [currentTool])

  useEffect(() => {
    DrawingManager.context = currentLayer.canvasRef.current.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
    DrawingManager.currentLayer = currentLayer
  }, [currentLayer])

  useEffect(() => {
    DrawingManager.interactLoop(currentUIInteraction);
  }, [])

  return (
    <Container className="board">
      <Panel className="canvases">
        {layers.map((layer, idx) => {
          return (
            <div key={`canvas_${layer.id}`} className="layer_canvas_container" style={{ zIndex: (1 - idx) + layers.length, mixBlendMode: layer.blendMode }}>
              <LayerCanvas ref={layer.canvasRef} id={layer.id} />
            </div>
          )
        })}
        <div className='layer_canvas_container canvas_separator'/>
      </Panel>
    </Container>
  )
}

export default Board
