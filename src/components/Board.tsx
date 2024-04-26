import { useEffect, useLayoutEffect, useRef } from "react"

import { DrawCanvas } from "@/components/DrawCanvas"

import { useToolStore } from "@/stores/ToolStore"
import { useLayerStore } from "@/stores/LayerStore"

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
    Application.init()

    return () => {
      Application.destroy()
    }
  }, [])

  useEffect(() => {
    Application.currentLayer = currentLayer
  }, [currentLayer])

  useEffect(() => {
    Application.swapTool(currentTool)
  }, [currentTool])

  return (
    <div className="noselect flex flex-1">
      <DrawCanvas ref={boardRef} />
    </div>
  )
}

export const Board = _Board
