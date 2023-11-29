import { tool_list, tool_types } from '../../constants'

import { getRelativeMousePos, getDistance, offsetPoint, smoothPoints, findQuadtraticBezierControlPoint } from '../../utils'

import { ILayer, Tool, Point, UIInteraction, MouseState, Operation } from '../../types'

class _DrawingManager {
  context: CanvasRenderingContext2D
  currentLayer: ILayer
  currentTool: Tool
  toolBelt: Record<string, (operation: Operation) => void>
  waitUntilInteractionEnd: boolean
  needRedraw: boolean

  constructor() {
    this.context = {} as CanvasRenderingContext2D
    this.currentLayer = {} as ILayer
    this.currentTool = {} as Tool
    this.waitUntilInteractionEnd = false
    this.needRedraw = false

    this.toolBelt = {
      [tool_list.PEN]: this.penDraw,
      [tool_list.BRUSH]: this.brushDraw,
      [tool_list.ERASER]: this.erase,
      [tool_list.FILL]: this.fill
    }
  }

  basePen = (operation: Operation) => {
    const points = operation.points.slice(-9)

    this.context.lineCap = 'round'
    this.context.lineJoin = 'round'
    this.context.miterLimit = 10
    this.context.strokeStyle = operation.tool.getCanvasColor(true)

    // TODO: make less lazy
    if (points.length < 3) {
      const point0 = points[0]
      const point1 = points[1]

      this.context.beginPath()

      this.context.moveTo(point0.x, point0.y)
      this.context.lineTo(point1.x, point1.y)
      this.context.stroke()
    } else {
      // We need to have slightly overlapping curves otherwise we likely have holes when the list of points is shortened
      for (let i = 2; i < points.length - 1; i += 1) {
        const startPoint = points[i - 2]
        const midPoint = points[i - 1]
        const endPoint = points[i]
        this.context.beginPath()

        this.context.moveTo(startPoint.x, startPoint.y)
        
        const controlPoint = findQuadtraticBezierControlPoint(startPoint, midPoint, endPoint)
        
        if (midPoint.pointerType === 'pen') {
          this.context.lineWidth = operation.tool.size! * midPoint.pressure
        } else {
          this.context.lineWidth = operation.tool.size!
        }
        
        this.context.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y)

        this.context.stroke()
      }

      if (points.length % 3 < 3) {
        for (let i = points.length - points.length % 3; i < points.length; i++) {
          const point0 = points[i - 1]
          const point1 = points[i]
          this.context.beginPath()
    
          this.context.moveTo(point0.x, point0.y)
          this.context.lineTo(point1.x, point1.y)
          this.context.stroke()
        }
      }
    }
  }

  brushLine = (operation: Operation, _point0: Point, _point1: Point) => {
    if (!operation.tool.image) {
      throw new Error("Brush has no image to draw with")
    }

    const point0 = offsetPoint(_point0, -operation.tool.image.height / 2)
    const point1 = offsetPoint(_point1, -operation.tool.image.height / 2)
    const distance = getDistance(point0, point1)
    const step = operation.tool.size * (operation.tool.spacing / 100)

    for (let i = 0; i < distance; i += step) {
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
    if (!operation.tool.image) {
      throw new Error("Brush has no image to draw with")
    }

    const i = operation.points.length - 1
    const point0 = operation.points[i - 1]
    const point1 = operation.points[i]

    const distance = getDistance(point0, point1)

    if (i === 0) {
      const offset = offsetPoint(operation.points[i], -operation.tool.image.height / 2)
      this.context.drawImage(operation.tool.image, offset.x, offset.y)

      operation.points[i].drawn = true

      return
    }

    const spacing = operation.tool.size * (operation.tool.spacing / 100)

    if (distance > spacing) {
      this.brushLine(operation, point0, point1)
      point0.drawn = true
      point1.drawn = true
    } else {
      if (!operation.tool.image) throw new Error("Tool is missing image")

      if (point0.pointerType === "pen") this.context.globalAlpha = (point1.pressure / 5)

      const offsetPoint1 = offsetPoint(point1, -operation.tool.image.height / 2)
      this.context.drawImage(operation.tool.image, offsetPoint1.x, offsetPoint1.y)

      point1.drawn = true
    }
  }

  fill = (operation: Operation) => {
    this.context.globalCompositeOperation ="source-over"

    this.currentLayer.fill(operation.tool.getCanvasColor(false))
  }

  erase = (operation: Operation) => {
    if (this.currentLayer.currentOperation.points.length <= 1) return

    this.context.globalCompositeOperation ="destination-out"
  
    this.baseBrush(operation)
  }

  brushDraw = (operation: Operation) => {
    this.context.globalCompositeOperation ="source-over"

    this.context.globalAlpha = operation.tool.opacity / 100
  
    this.baseBrush(operation)
  }
  
  penDraw = (operation: Operation) => {
    if (this.currentLayer.currentOperation.points.length <= 1) return

    smoothPoints(this.currentLayer.currentOperation.points)

    this.context.globalCompositeOperation ="source-over";
  
    this.basePen(operation)
  }

  draw = (operation: Operation) => {
    if (operation.points.length !== 0 && operation.points[operation.points.length - 1].drawn) return

    this.context.save()
    this.toolBelt[operation.tool.name](operation)
    this.context.restore()
  }
  
  endInteraction = (save = true) => {
    if (this.currentLayer.noDraw) return
    
    this.waitUntilInteractionEnd = false
    this.needRedraw = true

    if(save) this.currentLayer.saveAndStartNewOperation()
  }

  use = (relativeMouseState: MouseState, operation: Operation) => {
    if (!operation.tool) {
      operation.tool = this.currentTool
      operation.readyToDraw = true
    }
    
    if (this.waitUntilInteractionEnd) return
    const spacing = operation.tool.size * (operation.tool.spacing / 100)
    
    switch(operation.tool.type) {
      case tool_types.STROKE:
        if (operation.points.length === 0 || getDistance(operation.points[operation.points.length - 1], relativeMouseState) >= spacing) {
          operation.points.push({...relativeMouseState, drawn: false })
        }
        break

      case tool_types.POINT:
        this.waitUntilInteractionEnd = true
        break
    }
  }

  interactLoop = (currentUIInteraction: React.MutableRefObject<UIInteraction>) => {
    if (this.currentLayer.noDraw) return

    if (this.needRedraw) {
      this.context.save()
  
      this.context.setTransform(1, 0, 0, 1, 0, 0)
      this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height)
  
      this.context.restore()

      this.needRedraw = false
  
      if (this.currentLayer.undoSnapshotQueue.length > 0) {
        this.context.putImageData(this.currentLayer.undoSnapshotQueue[this.currentLayer.undoSnapshotQueue.length - 1], 0, 0)
      } else {
        if (this.currentLayer.drawingData) {
          this.context.putImageData(this.currentLayer.drawingData, 0, 0)
        }
      }
    }

    const relativeMouseState = getRelativeMousePos(this.context.canvas, currentUIInteraction.current.mouseState)


    if (currentUIInteraction.current.mouseState.leftMouseDown && relativeMouseState.inbounds) {
      this.use(relativeMouseState, this.currentLayer.currentOperation)
    }

    if (this.currentLayer.currentOperation.tool) {
      this.draw(this.currentLayer.currentOperation)
    }
  
    requestAnimationFrame(() => this.interactLoop(currentUIInteraction))
  }
  
  undo = () => {
    if (this.currentLayer.undoSnapshotQueue.length > 0 && this.currentLayer.currentOperation.points.length === 0) {
      this.currentLayer.undoSnapshotQueue.pop()
    }
    this.endInteraction(false)
  }
}

export const DrawingManager = new _DrawingManager()