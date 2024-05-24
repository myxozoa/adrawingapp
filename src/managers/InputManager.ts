import { DrawingManager } from "@/managers/DrawingManager"
import { updatePointer } from "@/managers/PointerManager"
import { Camera } from "@/objects/Camera"
import {
  throttleRAF,
  getDistance,
  calculateWorldPosition,
  CanvasSizeCache,
  calculatePointerWorldPosition,
} from "@/utils/utils"

import { ModifierKeyManager } from "@/managers/ModifierKeyManager"

import { Application } from "@/managers/ApplicationManager"
import { InteractionManager } from "@/managers/InteractionManager"

const resizeThrottle = throttleRAF()
const wheelThrottle = throttleRAF()

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
    DrawingManager.pauseDrawNextFrame()
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

function wheelZoom(event: WheelEvent) {
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
  const mouseXBeforeZoom = mousePositionBeforeZoom[0]
  const mouseYBeforeZoom = mousePositionBeforeZoom[1]

  Camera.zoom = Math.max(0.001, Math.min(100, zoomTarget))

  Camera.updateViewProjectionMatrix()

  const mousePositionAfterZoom = calculateWorldPosition(pointerPosition)
  const mouseXAfterZoom = mousePositionAfterZoom[0]
  const mouseYAfterZoom = mousePositionAfterZoom[1]

  // Repositioning to make the pointer closer to the world space position it had before the zoom
  const dx = mouseXAfterZoom - mouseXBeforeZoom
  const dy = mouseYAfterZoom - mouseYBeforeZoom

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

function pointerdown(event: PointerEvent) {
  idleTime = 0
  Application.gl.canvas.setPointerCapture(event.pointerId)

  if (event.pointerType === "touch") {
    DrawingManager.disableCursor()
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

  const position = calculatePointerWorldPosition(event)
  if (currentInteractionState === InteractionState.none) {
    Application.drawing = true

    currentInteractionState = InteractionState.useTool

    InteractionManager.process(position)

    InteractionManager.executeOperation(Application.currentOperation)
  }
  InteractionManager.currentMousePosition.x = position.x
  InteractionManager.currentMousePosition.y = position.y
  DrawingManager.hideCursor()
  DrawingManager.beginDraw()
}

function pointermove(event: PointerEvent) {
  idleTime = 0

  const position = calculatePointerWorldPosition(event)

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
        const coalescedRelativeMouseState = calculatePointerWorldPosition(coalescedEvent)

        InteractionManager.process(coalescedRelativeMouseState)
      }
    } else {
      InteractionManager.process(position)
    }

    InteractionManager.executeOperation(Application.currentOperation)
  }

  DrawingManager.beginDraw()
}

function pointerup(event: PointerEvent) {
  if (!isPointerEvent(event)) return
  idleTime = 0

  Application.drawing = false
  Application.gl.canvas.releasePointerCapture(event.pointerId)

  if (event.pointerType === "touch") {
    DrawingManager.hideCursor()
    removeEvent(event)
  } else {
    DrawingManager.showCursor()
  }

  if (currentInteractionState === InteractionState.useTool) {
    InteractionManager.endInteraction()
  }
  DrawingManager.pauseDrawNextFrame()

  reset()
}

function wheel(event: WheelEvent) {
  currentInteractionState = InteractionState.zoom
  idleTime = 0

  DrawingManager.beginDraw()
  wheelZoom(event)
  wheelThrottle(DrawingManager.pauseDrawNextFrame)

  currentInteractionState = InteractionState.none
}

function keyup(event: KeyboardEvent) {
  if (event.code === "Space" && event.type === "keyup") {
    reset()
  }
}

function pointercancel() {
  DrawingManager.pauseDrawNextFrame()
}

function pointerout() {
  DrawingManager.pauseDrawNextFrame()
}

function pointerleave() {
  DrawingManager.pauseDrawNextFrame()
}

const pointer_listeners = {
  pointerdown,
  pointermove,
  pointerup,
  pointercancel,
  pointerleave,
  pointerout,
}

const wheel_listeners = {
  wheel,
}

const keyboard_listeners = {
  keyup,
}

function ignoreEvent(event: Event) {
  event.preventDefault()
}

const touch_listeners = {
  touchdown: ignoreEvent,
  touchmove: ignoreEvent,
  touchend: ignoreEvent,
}

const mouse_listeners = {
  mousedown: ignoreEvent,
  mousemove: ignoreEvent,
  mouseend: ignoreEvent,
}

function resize() {
  idleTime = 0

  Application.resize()

  Camera.updateViewProjectionMatrix()
  DrawingManager.beginDraw()
  DrawingManager.pauseDrawNextFrame()
}

function windowResize() {
  resizeThrottle(() => {
    resize()

    // Device rotation hack
    setTimeout(resize, 1)
  })
}

interface EventEmitter {
  addEventListener<E extends keyof HTMLElementEventMap>(
    type: E,
    listener: (ev: HTMLElementEventMap[E]) => any,
    options: unknown,
  ): void
  removeEventListener<E extends keyof HTMLElementEventMap>(type: E, listener: (ev: HTMLElementEventMap[E]) => any): void
}

type Entries<T> = {
  [K in keyof T]: [K, T[K]]
}[keyof T][]

function objectEntries<T extends object>(obj: T): Entries<T> {
  return Object.entries(obj) as Entries<T>
}

function init() {
  for (const [name, callback] of objectEntries(pointer_listeners)) {
    ;(Application.gl.canvas as EventEmitter).addEventListener(name, callback, {
      capture: true,
      passive: true,
    })
  }

  for (const [name, callback] of objectEntries(wheel_listeners)) {
    ;(Application.gl.canvas as EventEmitter).addEventListener(name, callback, {
      capture: true,
      passive: true,
    })
  }

  for (const [name, callback] of objectEntries(keyboard_listeners)) {
    ;(Application.gl.canvas as EventEmitter).addEventListener(name, callback, {
      capture: true,
      passive: true,
    })
  }

  for (const [name, callback] of Object.entries(touch_listeners)) {
    Application.gl.canvas.addEventListener(name, callback, { capture: true })
  }

  for (const [name, callback] of Object.entries(mouse_listeners)) {
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
  for (const [name, callback] of objectEntries(pointer_listeners)) {
    ;(Application.gl.canvas as EventEmitter).removeEventListener(name, callback)
  }
  for (const [name, callback] of objectEntries(keyboard_listeners)) {
    ;(Application.gl.canvas as EventEmitter).removeEventListener(name, callback)
  }
  for (const [name, callback] of objectEntries(wheel_listeners)) {
    ;(Application.gl.canvas as EventEmitter).removeEventListener(name, callback)
  }

  for (const [name, callback] of objectEntries(touch_listeners)) {
    Application.gl.canvas.removeEventListener(name, callback)
  }

  for (const [name, callback] of objectEntries(mouse_listeners)) {
    Application.gl.canvas.removeEventListener(name, callback)
  }

  window.removeEventListener("resize", windowResize)
  screen.orientation.removeEventListener("change", windowResize)
}

export const InputManager = {
  init,
  destroy,
}
