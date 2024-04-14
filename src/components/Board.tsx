import { useEffect, useRef } from "react"

import { DrawCanvas } from "@/components/DrawCanvas"

import { useToolStore } from "@/stores/ToolStore"
import { useLayerStore } from "@/stores/LayerStore"

import { DrawingManager } from "@/managers/DrawingManager"

import { initializeCanvas } from "@/utils"
import { InteractionManager } from "@/managers/InteractionManager"

function _Board() {
  const boardRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
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
    InteractionManager.init()
    DrawingManager.start()

    return () => {
      InteractionManager.destroy()
    }
  }, [])

  useEffect(() => {
    DrawingManager.swapTool(currentTool)
  }, [currentTool])

  return (
    <div className="noselect flex flex-1">
      <DrawCanvas ref={boardRef} />
    </div>
  )
}

export const Board = _Board
