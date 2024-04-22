import { DrawingManager } from "@/managers/DrawingManager"
import { updatePointer } from "@/managers/PointerManager"
import { Camera } from "@/objects/Camera"
import { isPointerEvent, isPointerEventOrLocation, throttleRAF, getRelativeMousePosition, getDistance } from "@/utils"
import { isKeyboardEvent } from "@/utils"

import { ModifierKeyManager } from "@/managers/ModifierKeyManager"

import type { MouseState } from "@/types"
import { Application } from "@/managers/ApplicationManager"

const wheelThrottle = throttleRAF()
const resizeThrottle = throttleRAF()
const panThrottle = throttleRAF()

let touches: PointerEvent[] = []
let prevTouchDistance = -1

const startMidPosition = { x: 0, y: 0 }
const lastMidPosition = { x: 0, y: 0 }
const midPoint = { x: 0, y: 0 }

function calculateWorldPosition(event: PointerEvent | { x: number; y: number }): MouseState {
  const pointerState = isPointerEventOrLocation(event) ? updatePointer(event) : event

  const relativeMouseState = getRelativeMousePosition(DrawingManager.gl.canvas as HTMLCanvasElement, pointerState)

  const worldPosition = Camera.getWorldMousePosition(relativeMouseState, DrawingManager.gl)

  relativeMouseState.x = worldPosition[0]
  relativeMouseState.y = worldPosition[1]

  return relativeMouseState
}

function removeEvent(event: PointerEvent) {
  const index = touches.findIndex((cachedEv) => cachedEv.pointerId === event.pointerId)
  touches.splice(index, 1)
}

function wheelZoom(event: Event) {
  function isWheelEvent(event: Event): event is WheelEvent {
    return event instanceof WheelEvent
  }

  if (!isWheelEvent(event)) return

  const pointerState = updatePointer(event)

  const zoomTarget = Camera.zoom * Math.pow(2, event.deltaY * -0.001)

  zoom(pointerState, zoomTarget)
}

function pinchZoom(midPoint: { x: number; y: number }, distance: number) {
  // TODO: Change this
  if (prevTouchDistance !== -1) {
    const zoomTarget = Camera.zoom * (distance / prevTouchDistance)

    zoom(midPoint, zoomTarget)
  }
}

function zoom(pointerPosition: { x: number; y: number }, zoomTarget: number) {
  const mousePositionBeforeZoom = calculateWorldPosition(pointerPosition)

  Camera.zoom = Math.max(0.001, Math.min(30, zoomTarget))

  Camera.updateViewProjectionMatrix(DrawingManager.gl)

  const mousePositionAfterZoom = calculateWorldPosition(pointerPosition)

  // Repositioning to make the pointer closer to the world space position it had before the zoom
  const dx = mousePositionAfterZoom.x - mousePositionBeforeZoom.x
  const dy = mousePositionAfterZoom.y - mousePositionBeforeZoom.y

  Camera.x -= dx
  Camera.y -= dy

  Camera.updateViewProjectionMatrix(DrawingManager.gl)
}

function pan(midPosition: { x: number; y: number }) {
  const dx = (midPosition.x - lastMidPosition.x) * window.devicePixelRatio
  const dy = (midPosition.y - lastMidPosition.y) * window.devicePixelRatio

  Camera.x -= dx / Camera.zoom
  Camera.y -= dy / Camera.zoom

  Camera.updateViewProjectionMatrix(DrawingManager.gl)

  lastMidPosition.x = midPosition.x
  lastMidPosition.y = midPosition.y
}

function touchPan() {
  midPoint.x = (touches[0].x + touches[1].x) / 2
  midPoint.y = (touches[1].y + touches[1].y) / 2

  const distance = getDistance(touches[0], touches[1])

  pan(midPoint)
  pinchZoom(midPoint, distance)

  prevTouchDistance = distance

  DrawingManager.swapPixelInterpolation()

  DrawingManager.render()
}

function pointerdown(event: Event) {
  if (!isPointerEvent(event)) return
  ;(DrawingManager.gl.canvas as HTMLCanvasElement).setPointerCapture(event.pointerId)

  touches.push(event)

  if (touches.length > 2) {
    touches = []

    return
  }

  if (ModifierKeyManager.has("space") || (event.pointerType === "touch" && touches.length === 2)) {
    if (touches.length === 2) {
      startMidPosition.x = (touches[0].x + touches[1].x) / 2
      startMidPosition.y = (touches[1].y + touches[1].y) / 2
      lastMidPosition.x = startMidPosition.x
      lastMidPosition.y = startMidPosition.y
    } else {
      startMidPosition.x = event.x
      startMidPosition.y = event.y
      lastMidPosition.x = event.x
      lastMidPosition.y = event.y
    }
  } else {
    const position = calculateWorldPosition(event)

    DrawingManager.beginDraw(position)
  }
}

function pointermove(event: Event) {
  if (!isPointerEvent(event)) return

  const index = touches.findIndex((cachedEvent) => cachedEvent.pointerId === event.pointerId)
  touches[index] = event

  if (touches.length === 2) {
    panThrottle(touchPan)

    return
  }

  if (
    (DrawingManager.gl.canvas as HTMLCanvasElement).hasPointerCapture(event.pointerId) &&
    touches[0].pointerId === event.pointerId
  ) {
    if (ModifierKeyManager.has("space")) {
      if ((DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor !== "grab") {
        ;(DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor = "grab"
      }

      panThrottle(() => {
        pan(event)
        DrawingManager.render()
      })

      return
    }

    if ((DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor == "grab") {
      ;(DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor = "crosshair"
    }

    if (PointerEvent.prototype.getCoalescedEvents !== undefined) {
      const coalesced = event.getCoalescedEvents()

      for (const coalescedEvent of coalesced) {
        const coalescedRelativeMouseState = calculateWorldPosition(coalescedEvent)
        DrawingManager.continueDraw(coalescedRelativeMouseState)
      }
    } else {
      const position = calculateWorldPosition(event)

      DrawingManager.continueDraw(position)
    }
  }
}

function pointerup(event: Event) {
  if (!isPointerEvent(event)) return

  DrawingManager.drawing = false
  ;(DrawingManager.gl.canvas as HTMLCanvasElement).releasePointerCapture(event.pointerId)

  removeEvent(event)

  reset()
  DrawingManager.endInteraction()
}

function wheel(event: Event) {
  wheelThrottle(() => {
    wheelZoom(event)
    DrawingManager.swapPixelInterpolation()

    DrawingManager.render()
  })
}

function keyup(event: Event) {
  if (!isKeyboardEvent(event)) return

  if (event.code === "Space" && event.type === "keyup") {
    ;(DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor = "crosshair"

    reset()
  }
}

const listeners = {
  pointerdown,
  pointermove,
  pointerup,
  wheel,
  keyup,
}

function touchdown(event: Event) {
  event.preventDefault()
}

function touchmove(event: Event) {
  event.preventDefault()
}

function touchend(event: Event) {
  event.preventDefault()
}

const touch_listeners = {
  touchdown,
  touchmove,
  touchend,
}

function resize() {
  Application.resize()

  Camera.updateViewProjectionMatrix(DrawingManager.gl)
  DrawingManager.render()
}

function windowResize() {
  resizeThrottle(() => {
    resize()

    // Device rotation hack
    setTimeout(resize, 1)
  })
}

function init() {
  for (const [name, callback] of Object.entries(listeners)) {
    DrawingManager.gl.canvas.addEventListener(name, callback, { capture: true, passive: true })
  }

  for (const [name, callback] of Object.entries(touch_listeners)) {
    DrawingManager.gl.canvas.addEventListener(name, callback, { capture: true })
  }

  window.addEventListener("resize", windowResize)
  screen.orientation.addEventListener("change", windowResize)
}

function reset() {
  startMidPosition.x = 0
  startMidPosition.y = 0
  lastMidPosition.x = 0
  lastMidPosition.y = 0
  touches = []
  prevTouchDistance = -1
}

function destroy() {
  for (const [name, callback] of Object.entries(listeners)) {
    DrawingManager.gl.canvas.removeEventListener(name, callback)
  }

  for (const [name, callback] of Object.entries(touch_listeners)) {
    DrawingManager.gl.canvas.removeEventListener(name, callback)
  }

  window.removeEventListener("resize", windowResize)
  screen.orientation.removeEventListener("change", windowResize)
}

export const InteractionManager = {
  init,
  destroy,
}
