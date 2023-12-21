import { blend_modes } from "../constants"

import { ILayer, LayerID, LayerName, BlendModes, Size, Box } from "@/types"

export class Layer implements ILayer {
  blendMode: BlendModes
  name: LayerName
  id: LayerID
  undoSnapshotQueue: Float32Array[]
  redoSnapshotQueue: Float32Array[]
  drawingData: Float32Array
  noDraw: boolean
  size: Size
  boundingBox: Box

  constructor(name: LayerName, size: Size) {
    this.blendMode = blend_modes.normal
    this.name = name
    this.id = crypto.randomUUID ? crypto.randomUUID() : (Math.random() * Math.random()).toString()
    this.undoSnapshotQueue = []
    this.redoSnapshotQueue = []
    this.drawingData = new Float32Array(4 * size.width * size.height)
    this.noDraw = false
    this.size = size
    this.boundingBox = { x: 0, y: 0, ...size }
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
