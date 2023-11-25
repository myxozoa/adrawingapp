import { tool_list, tool_types } from '../../constants'

import { getRelativeMousePos, getDistance, offsetPoint, smoothPoints, findQuadtraticBezierControlPoint } from '../../utils'

import { ILayer, Tool, Point, UIInteraction, MouseState, Operation } from '../../types'

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
      [tool_list.ERASER]: this.erase,
      [tool_list.FILL]: this.fill
    }
  }

  basePen = (operation: Operation) => {        
    this.context.lineCap = 'round'
    this.context.lineJoin = 'round'
    this.context.miterLimit = 10
    this.context.strokeStyle = operation.tool.getCanvasColor(true)

    if (operation.points.length < 3) {
      const point0 = operation.points[0]
      const point1 = operation.points[1]
      this.context.beginPath()

      this.context.moveTo(point0.x, point0.y)
      this.context.lineTo(point1.x, point1.y)
      this.context.stroke()
    } else {
      // We need to have slightly overlapping curves otherwise we likely have holes when the list of points is shortened
      for (let i = 2; i < operation.points.length - 1; i += 1) {
        const startPoint = operation.points[i - 2]
        const midPoint = operation.points[i - 1]
        const endPoint = operation.points[i]
        this.context.beginPath()

        this.context.moveTo(startPoint.x, startPoint.y)
        
        const controlPoint = findQuadtraticBezierControlPoint(startPoint, midPoint, endPoint)
        
        if (midPoint.pointerType === 'pen') {
          this.context.lineWidth = operation.tool.size * midPoint.pressure
        } else {
          this.context.lineWidth = operation.tool.size
        }
        
        this.context.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y)

        this.context.stroke()
      }

      if (operation.points.length % 3 < 3) {
        for (let i = operation.points.length - operation.points.length % 3; i < operation.points.length; i++) {
          const point0 = operation.points[i - 1]
          const point1 = operation.points[i]
          this.context.beginPath()
    
          this.context.moveTo(point0.x, point0.y)
          this.context.lineTo(point1.x, point1.y)
          this.context.stroke()
        }
      }
    }
  }

  brushLine = (operation: Operation, _point0: Point, _point1: Point) => {
    const point0 = offsetPoint(_point0, -50)
    const point1 = offsetPoint(_point1, -50)
    const distance = getDistance(point0, point1)
    const step = (distance / operation.tool.size)

    for (let i = 0; i <= distance; i += step) {
      const t = Math.max(0, Math.min(1, i / distance))
      const x = point0.x + (point1.x - point0.x) * t
      const y = point0.y + (point1.y - point0.y) * t

      if (point0.pointerType === "pen") this.context.globalAlpha = (point0.pressure / 5)

      if (operation.tool.image) {
        this.context.drawImage(operation.tool.image, x, y)
      } else {
        console.error("No image in tool to be drawn")
      }
    }
  }

  baseBrush = (operation: Operation) => {
    for (let i = 1; i < operation.points.length; i++) {
      const point0 = operation.points[i - 1]
      const point1 = operation.points[i]

      const distance = getDistance(point0, point1)

      if (distance > operation.tool.size) {
        this.brushLine(operation, point0, point1)
      } else {
        if (!operation.tool.image) throw new Error("Tool is missing image")

        if (point0.pointerType === "pen") this.context.globalAlpha = (point0.pressure / 5)

        const offsetPoint0 = offsetPoint(point0, -50)
        this.context.drawImage(operation.tool.image, offsetPoint0.x, offsetPoint0.y)

        if (point0.pointerType === "pen") this.context.globalAlpha = (point1.pressure / 5)

        const offsetPoint1 = offsetPoint(point1, -50)
        this.context.drawImage(operation.tool.image, offsetPoint1.x, offsetPoint1.y)
      }
    }
  }

  fill = (operation: Operation) => {
    this.context.globalCompositeOperation ="source-over";

    this.currentLayer.fill(operation.tool.getCanvasColor(false))
  }

  erase = (operation: Operation) => {
    this.context.globalCompositeOperation ="destination-out";
  
    this.basePen(operation)
  }

  brushDraw = (operation: Operation) => {
    this.context.globalCompositeOperation ="source-over";
  
    this.baseBrush(operation)
  }
  
  penDraw = (operation: Operation) => {
    this.context.globalCompositeOperation ="source-over";
  
    this.basePen(operation)
  }

  draw = (operation: Operation) => {
    this.context.save()
    this.toolBelt[operation.tool.name](operation)
    this.context.restore()
  }
  
  endInteraction = () => {
    if (this.currentLayer.noDraw) return

    this.currentLayer.newElement()
  }

  use = (relativeMouseState: MouseState, operation: Operation) => {
    operation.tool = this.currentTool

    if (operation.tool.type === tool_types.stroke) {
      if (operation.points.length === 0 || getDistance(operation.points[operation.points.length - 1], relativeMouseState) > this.minDist) {
        operation.points.push(relativeMouseState)
      }
      if (operation.points.length > 2) {
        smoothPoints(operation.points)
      }
    } else {
      this.toolBelt[operation.tool.name](operation)
    }
  }

  interactLoop = (currentUIInteraction: React.MutableRefObject<UIInteraction>) => {
    if (this.currentLayer.noDraw) return

    this.context.reset()
    const relativeMouseState = getRelativeMousePos(this.context.canvas, currentUIInteraction.current.mouseState)

    if (this.currentLayer.undoSnapshotQueue.length > 0) {
      this.context.putImageData(this.currentLayer.undoSnapshotQueue[this.currentLayer.undoSnapshotQueue.length - 1], 0, 0)
    } else {
      if (this.currentLayer.drawingData) {
        this.context.putImageData(this.currentLayer.drawingData, 0, 0)
      }
    }

    if (currentUIInteraction.current.mouseState.leftMouseDown && relativeMouseState.inbounds) {
      this.use(relativeMouseState, this.currentLayer.currentOperation)
    }

    if (this.currentLayer.currentOperation.points.length > 1) {
      this.draw(this.currentLayer.currentOperation)
    }
    
    if (this.currentLayer.currentOperation.points.length % 33 === 0 && this.currentLayer.currentOperation.points.length >= 33) {
      const image = this.currentLayer.rasterizeElement()
      this.currentLayer.addElementToUndoSnapshotQueue(image)
      this.currentLayer.currentOperation.points = this.currentLayer.currentOperation.points.slice(-3)
    }
  
    requestAnimationFrame(() => this.interactLoop(currentUIInteraction))
  }
  
  undo = () => {
    if (this.currentLayer.undoSnapshotQueue.length > 0 && this.currentLayer.currentOperation.points.length === 0) {
      this.currentLayer.undoSnapshotQueue.pop()
    }
  }
}

export const DrawingManager = new _DrawingManager()