import { blend_modes } from "../constants"

import type { ILayer, LayerID, LayerName, Box } from "@/types"

// TODO: Fix this
export class Layer implements ILayer {
  blendMode: blend_modes
  name: LayerName
  id: LayerID
  undoSnapshotQueue: Float32Array[]
  redoSnapshotQueue: Float32Array[]
  noDraw: boolean
  boundingBox: Box
  opacity: number
  drawnTo: boolean

  constructor(name: LayerName) {
    this.blendMode = blend_modes.normal
    this.name = name
    this.id = crypto.randomUUID ? crypto.randomUUID() : (Math.random() * Math.random()).toString()
    this.undoSnapshotQueue = []
    this.redoSnapshotQueue = []
    this.noDraw = false
    this.boundingBox = { x: 0, y: 0, width: 1, height: 1 } //  TODO: Calculate every time drawn to
    this.opacity = 100
    this.drawnTo = false
  }

  setBoundingBox = (x: number, y: number, width: number, height: number) => {
    this.boundingBox.x = x
    this.boundingBox.y = y
    this.boundingBox.width = width
    this.boundingBox.height = height

    this.drawnTo = true
  }

  calculateNewBoundingBox = (x: number, y: number, width: number, height: number) => {
    if (!this.drawnTo) {
      this.setBoundingBox(x, y, width, height)
      return
    }

    const newBottomLeftX = Math.min(this.boundingBox.x, x)
    const newBottomLeftY = Math.min(this.boundingBox.y, y)

    const newUpperRightX = Math.max(this.boundingBox.x + this.boundingBox.width, x + width)
    const newUpperRightY = Math.max(this.boundingBox.y + this.boundingBox.height, y + height)

    const newWidth = newUpperRightX - newBottomLeftX
    const newHeight = newUpperRightY - newBottomLeftY

    this.boundingBox.x = newBottomLeftX
    this.boundingBox.y = newBottomLeftY

    this.boundingBox.width = newWidth
    this.boundingBox.height = newHeight
  }

  reset = () => {
    this.name = "New Layer"
    this.noDraw = false
    this.boundingBox = { x: 0, y: 0, width: 1, height: 1 } //  TODO: Calculate every time drawn to
    this.opacity = 100
    this.drawnTo = false
    this.id = crypto.randomUUID ? crypto.randomUUID() : (Math.random() * Math.random()).toString()
  }

  // addCurrentToUndoSnapshotQueue = (gl: WebGL2RenderingContext) => {
  //   const image = this.getImageData(gl)

  //   this.addElementToUndoSnapshotQueue(image)
  // }

  // addElementToUndoSnapshotQueue = (image: Uint32Array) => {
  //   this.undoSnapshotQueue.push(image)

  //   if (this.undoSnapshotQueue.length > 5) {
  //     this.drawingData = this.undoSnapshotQueue.shift()
  //   }
  // }

  // replaceDrawingData = (image: Uint32Array) => {
  //   this.drawingData = image
  // }

  // getImageData = (gl: WebGL2RenderingContext): Uint32Array => {
  //   this.noDraw = true

  // gl.readPixels(0, 0, this.size.width, this.size.height, gl.RGBA_INTEGER, gl.UNSIGNED_INT, this.drawingData)

  //   this.noDraw = false

  //   return this.drawingData
  // }

  // fill = (gl: WebGL2RenderingContext, color = "white") => {
  // context.save()
  // context.fillStyle = color
  // context.fillRect(0, 0, context.canvas.width, context.canvas.height)
  // context.restore()
  // }
}
