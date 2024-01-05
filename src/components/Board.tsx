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

    DrawingManager.gl = context
    DrawingManager.canvasRef = boardRef

    DrawingManager.init()
    DrawingManager.start(currentUIInteraction)
  }, [])

  // const saveImage = () => {
  //   DrawingManager.renderToScreen()
  //   const downloadLink = document.createElementNS("http://www.w3.org/1999/xhtml", "a") as HTMLAnchorElement

  //   boardRef.current.toBlob(function (blob) {
  //     if (!blob) {
  //       console.error("Unable to create blob and save image")
  //       return
  //     }

  //     const data = new File([blob], "image.png", { type: "png" })
  //     const url = URL.createObjectURL(data)

  //     if (!downloadLink.id) {
  //       downloadLink.id = "local_filesaver"
  //       downloadLink.download = "image.png"
  //       downloadLink.target = "_blank"
  //       downloadLink.rel = "noopener"
  //       downloadLink.style.display = "none"
  //       document.body.appendChild(downloadLink)
  //     }
  //     downloadLink.setAttribute("href", url)
  //     downloadLink.click()
  //     URL.revokeObjectURL(url)
  //   })
  // }

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
