import { tool_list, tool_types } from '../../constants'

import { getRelativeMousePos, getDistance, offsetPoint, findQuadtraticBezierControlPoint, getCanvasColor, lerp } from '../../utils'

import { ILayer, Tool, Point, UIInteraction, MouseState, Operation, MainStateType } from '../../types'

class _DrawingManager {
  context: CanvasRenderingContext2D
  currentLayer: ILayer
  currentTool: Tool
  toolBelt: Record<string, (operation: Operation) => void>
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  main: MainStateType

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
    const points = operation.points

    this.context.lineCap = 'round'
    this.context.lineJoin = 'round'
    this.context.miterLimit = 10
    this.context.strokeStyle = getCanvasColor(this.main.color, operation.tool.opacity)

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

  stamp = (point: Point, image: HTMLImageElement, offset = true) => {
    const _offsetPoint = offset ? offsetPoint(point, -image.height / 2) : point
    this.context.drawImage(image, _offsetPoint.x, _offsetPoint.y)

    point.drawn = true
  }

  brushLine = (operation: Operation, _point0: Point, _point1: Point) => {
    if (!operation.tool.image) {
      throw new Error("Brush has no image to draw with")
    }

    const point0 = offsetPoint(_point0, -operation.tool.image.height / 2)
    const point1 = offsetPoint(_point1, -operation.tool.image.height / 2)
    const distance = getDistance(point0, point1)
    const step = operation.tool.size * (operation.tool.spacing / 100)

    // Stamp at space interval between the two points
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

    const lastIndex = operation.points.length - 1
    const prevPoint = operation.points.at(-2)
    const currentPoint = operation.points.at(-1)

    const distance = getDistance(prevPoint, currentPoint)

    if (lastIndex === 0) {
      this.stamp(operation.points[0], operation.tool.image)
      return
    }

    const spacing = operation.tool.size * (operation.tool.spacing / 100)

    if (distance > spacing * 2) {
      this.brushLine(operation, prevPoint, currentPoint)
      prevPoint.drawn = true
      currentPoint.drawn = true
    } else {
      if (!operation.tool.image) throw new Error("Tool is missing image")

      if (prevPoint.pointerType === "pen") this.context.globalAlpha = (currentPoint.pressure / 5)

      this.stamp(currentPoint, operation.tool.image)
    }
  }

  fill = () => {
    this.context.globalCompositeOperation ="source-over"

    this.currentLayer.fill(getCanvasColor(this.main.color))
  }

  clear = () => {
    this.context.save()
  
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height)

    this.context.restore()
  }

  erase = (operation: Operation) => {
    if (this.currentLayer.currentOperation.points.length <= 1) return

    this.context.globalCompositeOperation ="destination-out"
  
    this.baseBrush(operation)
  }

  brushDraw = (operation: Operation) => {
    this.context.globalCompositeOperation = "source-over"

    this.context.globalAlpha = operation.tool.opacity / 100
  
    this.baseBrush(operation)
  }
  
  penDraw = (operation: Operation) => {
    if (this.currentLayer.currentOperation.points.length <= 1) return

    this.context.globalCompositeOperation ="source-over";
  
    this.basePen(operation)
  }

  draw = (operation: Operation) => {
    if (operation.points.length !== 0 && operation.points.at(-1).drawn) return

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
    const prevLocation = operation.points.at(-1)

    const smoothing = 0.2
    
    switch(operation.tool.type) {
      case tool_types.STROKE:
        if (operation.points.length === 0 || getDistance(prevLocation, relativeMouseState) >= spacing) {
          const interpolatedLocation = { ...relativeMouseState  }
          
          if (operation.points.length !== 0) {
            interpolatedLocation.x = lerp(prevLocation.x, interpolatedLocation.x, smoothing)
            interpolatedLocation.y = lerp(prevLocation.y, interpolatedLocation.y, smoothing)
          }

          operation.points.push({...interpolatedLocation, drawn: false })

          if (operation.points.length > 6) {
            operation.points.shift()
          }
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
      this.clear()

      this.needRedraw = false
  
      if (this.currentLayer.undoSnapshotQueue.length > 0) {
        this.context.putImageData(this.currentLayer.undoSnapshotQueue.at(-1), 0, 0)
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
      this.currentLayer.redoSnapshotQueue.push(this.currentLayer.undoSnapshotQueue.pop())
    }
    this.endInteraction(false)
  }
}

export const DrawingManager = new _DrawingManager()