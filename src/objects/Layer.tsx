import { createRef } from "react"

import { blend_modes } from "../constants"

import { ILayer, LayerID, LayerName, Operation, BlendModes } from "../types"

export class Layer implements ILayer {
  blendMode: BlendModes
  name: LayerName
  id: LayerID
  canvasRef: React.MutableRefObject<HTMLCanvasElement>
  currentOperation: Operation
  undoSnapshotQueue: ImageData[]
  drawingData: ImageData
  noDraw: boolean

  constructor(name: LayerName) {
    this.blendMode = blend_modes.normal
    this.name = name
    this.id = Math.random() * Math.random()
    this.canvasRef = createRef() as React.MutableRefObject<HTMLCanvasElement>
    this.currentOperation = { points: [], readyToDraw: false } as unknown as Operation
    this.undoSnapshotQueue = []
    this.drawingData = new ImageData(1, 1)
    this.noDraw = false
  }

  saveAndStartNewOperation = () => {
    const image = this.getImageData()

    this.addElementToUndoSnapshotQueue(image)

    this.currentOperation = { points: [], readyToDraw: false } as unknown as Operation // TODO: make these initializations more
  }

  addElementToUndoSnapshotQueue = (image: ImageData) => {
    this.undoSnapshotQueue.push(image)

    if (this.undoSnapshotQueue.length > 5) {
      this.drawingData = this.undoSnapshotQueue.shift()!
    }
  }

  replaceDrawingData = (image: ImageData) => {
    this.drawingData = image
  }

  getImageData = (): ImageData => {
    if (!this.canvasRef.current) throw new Error("Unable to find Canvas")

    this.noDraw = true

    const context = this.canvasRef.current.getContext("2d") as CanvasRenderingContext2D

    const image = context.getImageData(0, 0, this.canvasRef.current.width, this.canvasRef.current.height)

    this.noDraw = false

    return image
  }

  fill = (color = 'white') => {
    if (!this.canvasRef.current) throw new Error("Unable to find Canvas")
  
    const context = this.canvasRef.current.getContext("2d") as CanvasRenderingContext2D
    context.save()
    context.fillStyle = color
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)

    context.restore()
  }
}