import { useEffect, useLayoutEffect, useRef } from "react"

import { DrawCanvas } from "@/components/DrawCanvas"

import { useToolStore } from "@/stores/ToolStore"
import { useLayerStore } from "@/stores/LayerStore"

import { DrawingManager } from "@/managers/DrawingManager"

import { Application } from "@/managers/ApplicationManager"

function _Board() {
  const boardRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
  const currentLayer = useLayerStore.use.currentLayer()
  const currentTool = useToolStore.use.currentTool()

  useLayoutEffect(() => {
    const rect = boardRef.current.parentElement!.getBoundingClientRect()

    Application.createCanvas(boardRef.current, rect.width, rect.height)
  }, [])

  useEffect(() => {
    Application.initialize()

    return () => {
      Application.destroy()
    }
  }, [])

  useEffect(() => {
    DrawingManager.currentLayer = currentLayer
  }, [currentLayer])

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
