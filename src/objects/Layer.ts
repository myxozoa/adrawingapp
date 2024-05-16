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

  constructor(name: LayerName) {
    this.blendMode = blend_modes.normal
    this.name = name
    this.id = crypto.randomUUID ? crypto.randomUUID() : (Math.random() * Math.random()).toString()
    this.undoSnapshotQueue = []
    this.redoSnapshotQueue = []
    this.noDraw = false
    this.boundingBox = { x: 0, y: 0, width: 0, height: 0 } //  TODO: Calculate every time drawn to
    this.opacity = 100
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
