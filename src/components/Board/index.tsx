import "./styles.css"

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
  const { currentUIInteraction } = useUIState(DrawingManager.endInteraction, throttle(DrawingManager.undo))
  const currentLayer = useLayerStore.use.currentLayer()
  const currentTool = useToolStore.use.currentTool()

  useEffect(() => {
    DrawingManager.swapTool(currentTool)
  }, [currentTool])

  useEffect(() => {
    DrawingManager.currentLayer = currentLayer
  }, [currentLayer])

  useEffect(() => {
    const rect = boardRef.current.parentElement!.getBoundingClientRect()

    const context = initializeCanvas(boardRef.current, rect.width, rect.height, {
      desynchronized: true,
      resize: true,
    }) as WebGL2RenderingContext

    if (!context) {
      throw new Error("WebGL2 is not supported")
    }

    DrawingManager.gl = context
    DrawingManager.canvasRef = boardRef

    DrawingManager.init()
    DrawingManager.loop(currentUIInteraction, 0)
  }, [])

  // const saveImage = () => {
  //   DrawingManager.render()

  //   const downloadLink = document.createElement('a')
  //   downloadLink.setAttribute('download', 'CanvasAsImage.png')

  //   boardRef.current.toBlob(function(blob) {
  //     const url = URL.createObjectURL(blob)
  //     downloadLink.setAttribute('href', url)
  //     downloadLink.click()
  //   })
  // }

  return (
    <>
      <Container className="grow">
        <Panel className="flex relative w-full h-full">
          <div className="relative w-full h-full">
            <DrawCanvas ref={boardRef} />
          </div>
        </Panel>
      </Container>
      {/* <button onClick={() => saveImage()}>SAVE</button> */}
    </>
  )
}

export const Board = _Board
