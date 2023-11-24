import { createRef } from "react"

import { blend_modes } from "../constants"

import { ILayer, LayerID, LayerName, Operation, BlendModes } from "../types"

export class Layer implements ILayer {
  blendMode: BlendModes
  name: LayerName
  id: LayerID
  canvasRef: React.MutableRefObject<HTMLCanvasElement>
  currentOperation: Operation
  undoQueue: ImageData[]
  rasterizedEvents: ImageData
  noDraw: boolean

  constructor(name: LayerName) {
    this.blendMode = blend_modes.normal
    this.name = name
    this.id = Math.random() * Math.random()
    this.canvasRef = createRef() as React.MutableRefObject<HTMLCanvasElement>
    this.currentOperation = { points: [] , tool: {} } as unknown as Operation
    this.undoQueue = []
    this.rasterizedEvents = new ImageData(1, 1)
    this.noDraw = false
  }

  newElement = () => {
    const image = this.rasterizeElement()
    this.undoQueue.push(image)

    if (this.undoQueue.length > 5) {
      this.rasterizedEvents = this.undoQueue.shift()!
    }

    this.currentOperation = { points: [], tool: {} } as unknown as Operation // TODO: make these initializations more
  }

  rasterizeElement = (): ImageData => {
    if (!this.canvasRef.current) throw new Error("Unable to find Canvas")

    this.noDraw = true

    const context = this.canvasRef.current.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D

    const image = context.getImageData(0, 0, this.canvasRef.current.width, this.canvasRef.current.height)

    this.noDraw = false

    return image
  }

  fill = (color = 'white') => {
    if (!this.canvasRef.current) throw new Error("Unable to find Canvas")
  
    const context = this.canvasRef.current.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
    context.save()
    context.fillStyle = color
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)
    context.restore()
  }

  // newElement = () => {
  //   this.undoQueue.push({ ...this.currentOperation })

  //   if (this.undoQueue.length > 5 || countPoints(this.undoQueue) > 500) {
  //     this.rasterizeElement()
  //   }

  //   this.currentOperation = { points: [] }
  // }

  // rasterizeElement = () => {
  //   this.noDraw = true

  //   const context = this.canvasRef.current.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
    
  //   context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  //   if (this.rasterizedEvents) context.putImageData(this.rasterizedEvents, 0, 0)

  //   const element = this.undoQueue.shift()
  //   if (element.points.length > 0) DrawingManager.draw(element)

  //   this.rasterizedEvents = context.getImageData(0, 0, this.canvasRef.current.width, this.canvasRef.current.height)

  //   this.noDraw = false
  // }
}