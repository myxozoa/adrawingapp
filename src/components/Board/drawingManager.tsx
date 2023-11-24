import { tool_list } from '../../constants'

import { getRelativeMousePos, getDistance } from '../../utils'

import { ILayer, Tool, Point, Points, UIInteraction, MouseState, Operation } from '../../types'

const smoothLength = 3

function offsetPoint(point: Point, offset: number) {
  return { ...point, x: point.x + offset, y: point.y + offset }
}

function smooth(points: Points) {
  for (let i = 0; i < smoothLength; ++i) {
      const j = points.length - (i - 2)
      const point0 = points[j]
      const point1 = points[j + 1]
      const a = 0.2
      const point = {
          ...point0,
          pressure: (point0.pressure + point1.pressure) / 2,
          x: point0.x * (1 - a) + point1.x * a,
          y: point0.y * (1 - a) + point1.y * a
      }
      points[j] = point
  }
}

class _DrawingManager {
  context: CanvasRenderingContext2D
  currentLayer: ILayer
  currentTool: Tool
  minDist: number
  toolBelt: Record<string, (operation: Operation) => void>

  constructor() {
    this.context = {} as CanvasRenderingContext2D
    this.currentLayer = {} as ILayer
    this.currentTool = {} as Tool
    this.minDist = 1

    this.toolBelt = {
      [tool_list.PEN]: this.penDraw,
      [tool_list.BRUSH]: this.brushDraw,
      [tool_list.ERASER]: this.erase
    }
  }

  basePen = (operation: Operation) => {    
    const startPoint = operation.points[0]
    
    this.context.lineCap = 'round'
    this.context.lineJoin = 'round'
    this.context.miterLimit = 10
    this.context.strokeStyle = operation.tool.getCanvasColor(true)

    this.context.moveTo(startPoint.x, startPoint.y);
    
    for (let i = 1; i < operation.points.length; i++) {
      const prevPoint = operation.points[i - 1]
      const point = operation.points[i];
      this.context.beginPath()

      this.context.moveTo(prevPoint.x, prevPoint.y);

      if (point.pointerType === 'pen') {
        this.context.lineWidth = operation.tool.size * point.pressure
      } else {
        this.context.lineWidth = operation.tool.size
      }
  
      this.context.lineTo(point.x, point.y)
      this.context.stroke()
    }
  }

  brushLine = (operation: Operation, _point0: Point, _point1: Point) => {
    const point0 = offsetPoint(_point0, -50)
    const point1 = offsetPoint(_point1, -50)
    const distance = getDistance(point0, point1)
    const step = operation.tool.size / (distance ? distance : 1)
    let i = 0
    let t = 0
    let x: number
    let y: number

    while (i <= distance) {
      t = Math.max(0, Math.min(1, i / distance));
      x = point0.x + (point1.x - point0.x) * t;
      y = point0.y + (point1.y - point0.y) * t;

      this.context.globalAlpha = (point0.pressure / 5)

      if (operation.tool.image) {
        this.context.drawImage(operation.tool.image, x, y);
      } else {
        console.error("No image in tool to be drawn")
      }
      i += step
    }
  }

  baseBrush = (operation: Operation) => {
    for (let i = 1; i < operation.points.length; i++) {
      const point0 = operation.points[i - 1]
      const point1 = operation.points[i]
      this.brushLine(operation, point0, point1)
    }
    // operation.points.forEach(_point => {
    //   const point = offsetPoint(_point, -50)
    //   this.context.drawImage(operation.tool.image, point.x, point.y)
    // })
  }

  erase = (operation: Operation) => {
    this.context.globalCompositeOperation ="destination-out";
  
    this.basePen(operation)
  }

  brushDraw = (operation: Operation) => {
    this.context.save()
    this.context.globalCompositeOperation ="source-over";
  
    this.baseBrush(operation)
    this.context.restore()
  }
  
  penDraw = (operation: Operation) => {
    this.context.globalCompositeOperation ="source-over";
  
    this.basePen(operation)
  }

  draw = (operation: Operation) => {
    this.toolBelt[operation.tool.name](operation)
  }
  
  endInteraction = () => {
    if (this.currentLayer.noDraw) return

    this.currentLayer.newElement()
  }

  use = (relativeMouseState: MouseState, operation: Operation) => {
    operation.tool = this.currentTool
    if (operation.points.length === 0 || getDistance(operation.points[operation.points.length - 1], relativeMouseState) > this.minDist) {
      operation.points.push(relativeMouseState);
    }
    if (operation.points.length > smoothLength) {
      smooth(operation.points)
    }
  }

  interactLoop = (currentUIInteraction: React.MutableRefObject<UIInteraction>) => {
    if (this.currentLayer.noDraw) return

    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    const relativeMouseState = getRelativeMousePos(this.context.canvas, currentUIInteraction.current.mouseState)

    if (this.currentLayer.rasterizedEvents) {
      this.context.putImageData(this.currentLayer.rasterizedEvents, 0, 0)
    }
  
    // this.currentLayer.undoQueue.forEach(element => {
    //   if (element.points.length > 0) this.draw(element)
    // })
  
    if (this.currentLayer.undoQueue.length > 0) this.context.putImageData(this.currentLayer.undoQueue[this.currentLayer.undoQueue.length - 1], 0, 0)

    if (currentUIInteraction.current.mouseState.leftMouseDown && relativeMouseState.inbounds) {
      this.use(relativeMouseState, this.currentLayer.currentOperation)
    }

    // if (this.currentTool.name === tool_list.BRUSH && this.currentLayer.currentOperation.points.length > 10) {
    //   this.currentLayer.currentOperation.points = this.currentLayer.currentOperation.points.slice(-10)
    // }

    if (this.currentLayer.currentOperation.points.length > 1) {
      this.draw(this.currentLayer.currentOperation)
    }
  
    requestAnimationFrame(() => this.interactLoop(currentUIInteraction))
  }
  
  undo = () => {
    if (this.currentLayer.undoQueue.length > 0 && this.currentLayer.currentOperation.points.length === 0) {
      this.currentLayer.undoQueue.pop()
    }
  }
}

export const DrawingManager = new _DrawingManager()