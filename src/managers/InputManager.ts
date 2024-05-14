import { DrawingManager } from "@/managers/DrawingManager"
import { updatePointer } from "@/managers/PointerManager"
import { Camera } from "@/objects/Camera"
import {
  isPointerEvent,
  throttleRAF,
  getDistance,
  isWheelEvent,
  isKeyboardEvent,
  calculateWorldPosition,
  CanvasSizeCache,
} from "@/utils"

import { ModifierKeyManager } from "@/managers/ModifierKeyManager"

import { Application } from "@/managers/ApplicationManager"
import { InteractionManager } from "@/managers/InteractionManager"
import type { MouseState } from "@/types"

const resizeThrottle = throttleRAF()

enum InteractionState {
  none,
  pan,
  zoom,
  touchPanZoom,
  useTool,
}

let currentInteractionState: InteractionState = InteractionState.none
const touches: PointerEvent[] = []
let prevTouchDistance = -1

const startMidPosition = { x: 0, y: 0 }
const lastMidPosition = { x: 0, y: 0 }
const midPoint = { x: 0, y: 0 }

let idleTime = 0

function incrementIdleTimer() {
  idleTime++

  // Pause rendering while idle
  if (idleTime > 10) {
    DrawingManager.pauseDraw()
  }
}

setInterval(incrementIdleTimer, 100)

function removeEvent(event: PointerEvent) {
  const index = touches.findIndex((cachedEv) => cachedEv.pointerId === event.pointerId)
  touches.splice(index, 1)
}

function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return i
    }
  }
  return -1
}

function wheelZoom(event: Event) {
  if (!isWheelEvent(event)) return

  const pointerState = updatePointer(event)

  const zoomTarget = Camera.zoom * Math.pow(2, event.deltaY * -0.001)

  zoom(pointerState, zoomTarget)
}

function pinchZoom(midPoint: { x: number; y: number }, distance: number) {
  // TODO: Change this
  if (prevTouchDistance === -1) return

  const zoomTarget = Camera.zoom * (distance / prevTouchDistance)

  zoom(midPoint, zoomTarget)
}

function zoom(pointerPosition: { x: number; y: number }, zoomTarget: number) {
  const gl = Application.gl

  gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)

  const mousePositionBeforeZoom = calculateWorldPosition(pointerPosition)

  Camera.zoom = Math.max(0.001, Math.min(100, zoomTarget))

  Camera.updateViewProjectionMatrix()

  const mousePositionAfterZoom = calculateWorldPosition(pointerPosition)

  // Repositioning to make the pointer closer to the world space position it had before the zoom
  const dx = mousePositionAfterZoom.x - mousePositionBeforeZoom.x
  const dy = mousePositionAfterZoom.y - mousePositionBeforeZoom.y

  Camera.x -= dx
  Camera.y -= dy

  Camera.updateViewProjectionMatrix()
}

function pan(midPosition: { x: number; y: number }) {
  if (lastMidPosition.x === 0 && lastMidPosition.y === 0) return
  const gl = Application.gl

  gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)

  const dx = midPosition.x - lastMidPosition.x
  const dy = midPosition.y - lastMidPosition.y

  Camera.x -= dx / Camera.zoom
  Camera.y -= dy / Camera.zoom

  Camera.updateViewProjectionMatrix()

  lastMidPosition.x = midPosition.x
  lastMidPosition.y = midPosition.y
}

function touchPanZoom() {
  midPoint.x = (touches[0].x + touches[1].x) / 2
  midPoint.y = (touches[0].y + touches[1].y) / 2

  const distance = getDistance(touches[0], touches[1])

  pan(midPoint)
  pinchZoom(midPoint, distance)

  prevTouchDistance = distance
}

function pointerdown(event: Event) {
  if (!isPointerEvent(event)) return
  idleTime = 0
  ;(Application.gl.canvas as HTMLCanvasElement).setPointerCapture(event.pointerId)

  if (event.pointerType === "touch") {
    touches.push(event)

    if (touches.length > 2) {
      InteractionManager.endInteraction(false)
      touches.length = 0

      return
    }
    if (touches.length === 2) {
      InteractionManager.endInteraction(false)
      currentInteractionState = InteractionState.touchPanZoom

      startMidPosition.x = (touches[0].x + touches[1].x) / 2
      startMidPosition.y = (touches[0].y + touches[1].y) / 2
      lastMidPosition.x = startMidPosition.x
      lastMidPosition.y = startMidPosition.y

      DrawingManager.beginDraw()

      return
    }

    DrawingManager.beginDraw()
  }

  if (ModifierKeyManager.has("space")) {
    currentInteractionState = InteractionState.pan

    startMidPosition.x = event.x
    startMidPosition.y = event.y
    lastMidPosition.x = event.x
    lastMidPosition.y = event.y
  }

  if (currentInteractionState === InteractionState.none) {
    Application.drawing = true

    currentInteractionState = InteractionState.useTool

    const position = calculateWorldPosition(event) as MouseState

    InteractionManager.process(position)

    InteractionManager.executeOperation(Application.currentOperation)
  }

  DrawingManager.beginDraw()
}

function pointermove(event: Event) {
  if (!isPointerEvent(event)) return
  idleTime = 0

  const position = calculateWorldPosition(event) as MouseState

  InteractionManager.currentMousePosition.x = position.x
  InteractionManager.currentMousePosition.y = position.y

  if (event.pointerType === "touch") {
    const index = findLastIndex(touches, (cachedEvent) => cachedEvent.pointerId === event.pointerId)
    touches[index] = event

    if (currentInteractionState === InteractionState.touchPanZoom) {
      touchPanZoom()
    }
  }

  if (currentInteractionState === InteractionState.pan) {
    pan(event)
  }

  if (currentInteractionState === InteractionState.useTool) {
    if (PointerEvent.prototype.getCoalescedEvents !== undefined) {
      const coalesced = event.getCoalescedEvents()

      for (const coalescedEvent of coalesced) {
        const coalescedRelativeMouseState = calculateWorldPosition(coalescedEvent) as MouseState

        InteractionManager.process(coalescedRelativeMouseState)
      }
    } else {
      InteractionManager.process(position)
    }

    InteractionManager.executeOperation(Application.currentOperation)
  }

  DrawingManager.beginDraw()
}

function pointerup(event: Event) {
  if (!isPointerEvent(event)) return
  idleTime = 0

  Application.drawing = false
  ;(Application.gl.canvas as HTMLCanvasElement).releasePointerCapture(event.pointerId)

  if (event.pointerType === "touch") {
    removeEvent(event)
  }

  if (currentInteractionState === InteractionState.useTool) {
    InteractionManager.endInteraction()
  }
  DrawingManager.pauseDraw()

  reset()
}

function wheel(event: Event) {
  currentInteractionState = InteractionState.zoom
  idleTime = 0

  DrawingManager.beginDraw()
  wheelZoom(event)
  DrawingManager.pauseDraw()

  currentInteractionState = InteractionState.none
}

function keyup(event: Event) {
  if (!isKeyboardEvent(event)) return

  if (event.code === "Space" && event.type === "keyup") {
    reset()
  }
}

function pointercancel(event: Event) {
  if (!isPointerEvent(event)) return

  DrawingManager.pauseDraw()
}

function pointerout(event: Event) {
  if (!isPointerEvent(event)) return

  DrawingManager.pauseDraw()
}

function pointerleave(event: Event) {
  if (!isPointerEvent(event)) return

  DrawingManager.pauseDraw()
}

const listeners = {
  pointerdown,
  pointermove,
  pointerup,
  pointercancel,
  pointerleave,
  pointerout,
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
  idleTime = 0

  Application.resize()

  Camera.updateViewProjectionMatrix()
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
    Application.gl.canvas.addEventListener(name, callback, { capture: true, passive: true })
  }

  for (const [name, callback] of Object.entries(touch_listeners)) {
    Application.gl.canvas.addEventListener(name, callback, { capture: true })
  }

  window.addEventListener("resize", windowResize)
  screen.orientation.addEventListener("change", windowResize)
}

function reset() {
  startMidPosition.x = 0
  startMidPosition.y = 0
  lastMidPosition.x = 0
  lastMidPosition.y = 0
  midPoint.x = 0
  midPoint.y = 0
  touches.length = 0
  prevTouchDistance = -1

  currentInteractionState = InteractionState.none
}

function destroy() {
  for (const [name, callback] of Object.entries(listeners)) {
    Application.gl.canvas.removeEventListener(name, callback)
  }

  for (const [name, callback] of Object.entries(touch_listeners)) {
    Application.gl.canvas.removeEventListener(name, callback)
  }

  window.removeEventListener("resize", windowResize)
  screen.orientation.removeEventListener("change", windowResize)
}

export const InputManager = {
  init,
  destroy,
}
