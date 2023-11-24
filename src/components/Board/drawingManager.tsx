import { tool_list } from '../../constants'

import { getRelativeMousePos, getDistance } from '../../utils'

const smoothLength = 3

function offsetPoint(point, offset) {
  return { ...point, x: point.x + offset, y: point.y + offset }
}

function smooth(points) {
  for (let i = 0; i < smoothLength; ++i) {
      const j = points.length - i - 2
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
  constructor() {
    this.context
    this.currentLayer
    this.currentTool
    this.minDist = 1

    this.toolBelt = {
      [tool_list.PEN]: this.penDraw,
      [tool_list.BRUSH]: this.brushDraw,
      [tool_list.ERASER]: this.erase
    }
  }

  basePen = (interactionEvent) => {    
    const startPoint = interactionEvent.points[0]
    
    this.context.lineCap = 'round'
    this.context.lineJoin = 'round'
    this.context.miterLimit = 10
    this.context.strokeStyle = interactionEvent.tool.getCanvasColor(true)

    this.context.moveTo(startPoint.x, startPoint.y);
    
    for (let i = 1; i < interactionEvent.points.length; i++) {
      const prevPoint = interactionEvent.points[i - 1]
      const point = interactionEvent.points[i];
      this.context.beginPath()

      this.context.moveTo(prevPoint.x, prevPoint.y);

      if (point.pointerType === 'pen') {
        this.context.lineWidth = interactionEvent.tool.size * point.pressure
      } else {
        this.context.lineWidth = interactionEvent.tool.size
      }
  
      this.context.lineTo(point.x, point.y)
      this.context.stroke()
    }
  }

  brushLine = (interactionEvent, _point0, _point1) => {
    const point0 = offsetPoint(_point0, -50)
    const point1 = offsetPoint(_point1, -50)
    const distance = getDistance(point0, point1)
    const step = interactionEvent.tool.size / (distance ? distance : 1)
    let i = 0
    let t = 0
    let x, y

    while (i <= distance) {
      t = Math.max(0, Math.min(1, i / distance));
      x = point0.x + (point1.x - point0.x) * t;
      y = point0.y + (point1.y - point0.y) * t;

      this.context.globalAlpha = (point0.pressure / 5)

      this.context.drawImage(interactionEvent.tool.image, x, y);
      i += step
    }
  }

  baseBrush = (interactionEvent) => {
    for (let i = 1; i < interactionEvent.points.length; i++) {
      const point0 = interactionEvent.points[i - 1]
      const point1 = interactionEvent.points[i]
      this.brushLine(interactionEvent, point0, point1)
    }
    // interactionEvent.points.forEach(_point => {
    //   const point = offsetPoint(_point, -50)
    //   this.context.drawImage(interactionEvent.tool.image, point.x, point.y)
    // })
  }

  erase = (interactionEvent) => {
    this.context.globalCompositeOperation ="destination-out";
  
    this.basePen(interactionEvent)
  }

  brushDraw = (interactionEvent) => {
    this.context.save()
    this.context.globalCompositeOperation ="source-over";
  
    this.baseBrush(interactionEvent)
    this.context.restore()
  }
  
  penDraw = (interactionEvent) => {
    this.context.globalCompositeOperation ="source-over";
  
    this.basePen(interactionEvent)
  }

  draw = (interactionEvent) => {
    this.toolBelt[interactionEvent.tool.name](interactionEvent)
  }
  
  endInteraction = () => {
    if (this.currentLayer.noDraw) return

    this.currentLayer.newElement()
  }

  use = (relativeMouseState, interactionEvents) => {
    interactionEvents.tool = this.currentTool
    if (interactionEvents.points.length === 0 || getDistance(interactionEvents.points[interactionEvents.points.length - 1], relativeMouseState) > this.minDist) {
      interactionEvents.points.push(relativeMouseState);
    }
    if (interactionEvents.points.length > smoothLength) {
      smooth(interactionEvents.points)
    }
  }

  interactLoop = (currentInteraction) => {
    if (this.currentLayer.noDraw) return

    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    const relativeMouseState = getRelativeMousePos(this.context.canvas, currentInteraction.current.mouseState)

    if (this.currentLayer.rasterizedEvents) {
      this.context.putImageData(this.currentLayer.rasterizedEvents, 0, 0)
    }
  
    // this.currentLayer.undoQueue.forEach(element => {
    //   if (element.points.length > 0) this.draw(element)
    // })
  
    if (this.currentLayer.undoQueue.length > 0) this.context.putImageData(this.currentLayer.undoQueue[this.currentLayer.undoQueue.length - 1], 0, 0)

    if (currentInteraction.current.mouseState.leftMouseDown && relativeMouseState.inbounds) {
      this.use(relativeMouseState, this.currentLayer.currentEvent)
    }

    // if (this.currentTool.name === tool_list.BRUSH && this.currentLayer.currentEvent.points.length > 10) {
    //   this.currentLayer.currentEvent.points = this.currentLayer.currentEvent.points.slice(-10)
    // }

    if (this.currentLayer.currentEvent.points.length > 1) {
      this.draw(this.currentLayer.currentEvent)
    }
  
    requestAnimationFrame(() => this.interactLoop(currentInteraction))
  }
  
  undo = () => {
    if (this.currentLayer.undoQueue.length > 0 && this.currentLayer.currentEvent.points.length === 0) {
      this.currentLayer.undoQueue.pop()
    }
  }
}

export const DrawingManager = new _DrawingManager()