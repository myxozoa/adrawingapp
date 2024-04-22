import { initializeCanvas, resizeCanvasToDisplaySize } from "@/utils"

import { DrawingManager } from "@/managers/DrawingManager"
import { InteractionManager } from "@/managers/InteractionManager"

class _Application {
  offscreenCanvas: OffscreenCanvas
  localContext: WebGL2RenderingContext

  createCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
    const context = initializeCanvas(canvas, width, height, {
      resize: true,
    }) as WebGL2RenderingContext

    DrawingManager.gl = context
    this.localContext = context
  }

  resize = () => {
    resizeCanvasToDisplaySize(this.localContext.canvas as HTMLCanvasElement)
  }

  initialize = () => {
    DrawingManager.init()
    InteractionManager.init()
    DrawingManager.start()
  }

  destroy = () => {
    InteractionManager.destroy()
  }
}

export const Application = new _Application()
