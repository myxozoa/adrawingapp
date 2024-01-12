import { useEffect, useRef } from "react"

import Panel from "@/components/Panel"
import Container from "@/components/Container"
import { DrawCanvas } from "@/components/DrawCanvas"

import useUIState from "@/hooks/useUIState"

import { useToolStore } from "@/stores/ToolStore"
import { useLayerStore } from "@/stores/LayerStore"

import { DrawingManager } from "@/managers/drawingManager"

import { throttle, initializeCanvas } from "@/utils"

function _Board() {
  const boardRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
  const { currentUIInteraction } = useUIState(throttle(DrawingManager.undo))
  const currentLayer = useLayerStore.use.currentLayer()
  const currentTool = useToolStore.use.currentTool()

  useEffect(() => {
    DrawingManager.currentLayer = currentLayer
  }, [currentLayer])

  useEffect(() => {
    const rect = boardRef.current.parentElement!.getBoundingClientRect()

    const context = initializeCanvas(boardRef.current, rect.width, rect.height, {
      resize: true,
    }) as WebGL2RenderingContext

    DrawingManager.gl = context
    DrawingManager.canvasRef = boardRef

    DrawingManager.init()
    DrawingManager.start(currentUIInteraction)
  }, [])

  useEffect(() => {
    DrawingManager.swapTool(currentTool)
  }, [currentTool])

  return (
    <>
      <Container className="grow">
        <Panel className="relative flex h-full w-full">
          <div className="relative h-full w-full">
            <DrawCanvas ref={boardRef} />
          </div>
        </Panel>
      </Container>
      {/* <button onClick={() => saveImage()}>SAVE</button> */}
    </>
  )
}

export const Board = _Board
