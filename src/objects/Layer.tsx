import { createRef } from "react"

import { blend_modes } from "../constants"

export class Layer {
  constructor(name: string) {
    this.blendMode = blend_modes.default
    this.name = name
    this.id = Math.random() * Math.random()
    this.canvasRef = createRef({}) as React.RefObject<HTMLCanvasElement>
    this.currentEvent = { points: [] }
    this.undoQueue = []
    this.rasterizedEvents = null
    this.noDraw = false
  }

  newElement = () => {
    const image = this.rasterizeElement()
    this.undoQueue.push(image)

    if (this.undoQueue.length > 5) {
      this.rasterizedEvents = this.undoQueue.shift()
    }

    this.currentEvent = { points: [] }
  }

  rasterizeElement = () => {
    this.noDraw = true

    const context = this.canvasRef.current.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D

    const image = context.getImageData(0, 0, this.canvasRef.current.width, this.canvasRef.current.height)

    this.noDraw = false

    return image
  }

  fill = (color = 'white') => {
    const context = this.canvasRef.current.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D
    context.save()
    context.fillStyle = color
    context.fillRect(0, 0, context.canvas.width, context.canvas.height)
    context.restore()
  }

  // newElement = () => {
  //   this.undoQueue.push({ ...this.currentEvent })

  //   if (this.undoQueue.length > 5 || countPoints(this.undoQueue) > 500) {
  //     this.rasterizeElement()
  //   }

  //   this.currentEvent = { points: [] }
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