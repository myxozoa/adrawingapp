"use client"

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
import { usePreferenceStore } from "@/stores/PreferenceStore"
import { LocationStorage } from "@/objects/utils"

const wheelThrottle = throttleRAF()

function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) {
      return i
    }
  }
  return -1
}

enum InteractionState {
  none,
  pan,
  zoom,
  touchPanZoom,
  useTool,
}

let currentInteractionState: InteractionState = InteractionState.none

interface Touch {
  x: number
  y: number
  pointerId: number
}

class TouchManager {
  touches: Touch[]
  midPoint: {
    x: number
    y: number
  }
  maxTouches: number

  constructor(maxTouches = 2) {
    this.maxTouches = maxTouches
    this.touches = []
    this.midPoint = new LocationStorage()
  }

  addTouch = (event: PointerEvent) => {
    this.touches.push({
      x: event.x,
      y: event.y,
      pointerId: event.pointerId,
    })
  }

  removeTouch = (event: PointerEvent) => {
    const index = this.touches.findIndex((cachedEv) => cachedEv.pointerId === event.pointerId)

    if (index === -1) throw new Error("Touch could not be found to be removed")

    this.touches.splice(index, 1)
  }

  getMidPoint = () => {
    this.midPoint.x =
      this.touches.reduce((acc: number, currentTouch: Touch) => {
        return acc + currentTouch.x
      }, 0) / this.touches.length
    this.midPoint.y =
      this.touches.reduce((acc: number, currentTouch: Touch) => {
        return acc + currentTouch.y
      }, 0) / this.touches.length

    return this.midPoint
  }

  getTouchByID = (pointerId: number) => {
    const touch = this.touches.find((touch) => touch.pointerId === pointerId)

    if (typeof touch === "undefined") throw new Error("Touch could not be found by ID")

    return
  }

  getTouch = (index: number) => {
    if (index >= this.touches.length) throw new Error("Touch index out of bounds")
    if (index < 0) throw new Error("Touch index cannot be negative")

    return this.touches[index]
  }

  updateTouch = (event: PointerEvent) => {
    const index = findLastIndex(this.touches, (cachedEvent) => cachedEvent.pointerId === event.pointerId)

    if (index === -1) throw new Error("Touch could not be found in order to be updated")

    this.touches[index] = event
  }

  clear = () => {
    this.touches.length = 0
  }

  get length() {
    return this.touches.length
  }
}

const touches = new TouchManager()
let prevTouchDistance = -1

const startMidPoint = new LocationStorage()
const lastMidPoint = new LocationStorage()

let idleTime = 0

function incrementIdleTimer() {
  idleTime++

  // Pause rendering while idle
  if (idleTime > 10) {
    DrawingManager.pauseDrawNextFrame()
  }
}

setInterval(incrementIdleTimer, 100)

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

  const mousePositionBeforeZoom = calculateWorldPosition({ x: pointerPosition.x, y: pointerPosition.y })
  const mouseXBeforeZoom = mousePositionBeforeZoom[0]
  const mouseYBeforeZoom = mousePositionBeforeZoom[1]

  Camera.zoom = Math.max(0.001, Math.min(100, zoomTarget))

  Camera.updateViewProjectionMatrix()

  const mousePositionAfterZoom = calculateWorldPosition({ x: pointerPosition.x, y: pointerPosition.y })
  const mouseXAfterZoom = mousePositionAfterZoom[0]
  const mouseYAfterZoom = mousePositionAfterZoom[1]

  // Repositioning to make the pointer closer to the world space position it had before the zoom
  const dx = mouseXAfterZoom - mouseXBeforeZoom
  const dy = mouseYAfterZoom - mouseYBeforeZoom

  Camera.x -= dx
  Camera.y -= dy

  Camera.updateViewProjectionMatrix()
}

function pan(midPoint: { x: number; y: number }) {
  if (lastMidPoint.x === 0 && lastMidPoint.y === 0) return
  const gl = Application.gl

  gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)

  let dx = midPoint.x - lastMidPoint.x
  let dy = midPoint.y - lastMidPoint.y

  dx *= window.devicePixelRatio
  dy *= window.devicePixelRatio

  Camera.x -= dx / Camera.zoom
  Camera.y -= dy / Camera.zoom

  Camera.updateViewProjectionMatrix()

  lastMidPoint.x = midPoint.x
  lastMidPoint.y = midPoint.y
}

function touchPanZoom() {
  if (touches.length < 2) throw new Error("Too few touches to be able to pan/zoom")

  const distance = getDistance(touches.getTouch(0), touches.getTouch(1))

  const midPoint = touches.getMidPoint()

  pan(midPoint)
  pinchZoom(midPoint, distance)

  prevTouchDistance = distance
}

function pointerdown(event: PointerEvent) {
  idleTime = 0
  Application.gl.canvas.setPointerCapture(event.pointerId)

  document.body.style.cursor = "none"
  ;(event.target as HTMLCanvasElement).focus()

  if (event.pointerType !== "touch") touches.clear()

  if (event.pointerType === "touch") {
    DrawingManager.disableCursor()
    touches.addTouch(event)

    if (touches.length > 2) {
      touches.clear()
      InteractionManager.endInteraction(false)

      return
    }
    if (touches.length === 2) {
      InteractionManager.endInteraction(false)
      currentInteractionState = InteractionState.touchPanZoom

      const midPoint = touches.getMidPoint()
      startMidPoint.x = midPoint.x
      startMidPoint.y = midPoint.y
      lastMidPoint.x = startMidPoint.x
      lastMidPoint.y = startMidPoint.y

      DrawingManager.beginDraw()

      return
    }

    DrawingManager.beginDraw()
  }

  if (ModifierKeyManager.keys.has("space")) {
    currentInteractionState = InteractionState.pan

    startMidPoint.x = event.x
    startMidPoint.y = event.y
    lastMidPoint.x = event.x
    lastMidPoint.y = event.y
  }

  const position = calculatePointerWorldPosition(event)
  InteractionManager.currentMousePosition.x = position.x
  InteractionManager.currentMousePosition.y = position.y
  if (currentInteractionState === InteractionState.none) {
    Application.drawing = true

    currentInteractionState = InteractionState.useTool

    InteractionManager.process(position)

    queueMicrotask(InteractionManager.executeOperation)
  }
  DrawingManager.hideCursor()
  DrawingManager.beginDraw()

  event.stopPropagation()
}

function pointermove(event: PointerEvent) {
  idleTime = 0

  const position = calculatePointerWorldPosition(event)

  InteractionManager.currentMousePosition.x = position.x
  InteractionManager.currentMousePosition.y = position.y

  if (event.pointerType === "touch") {
    touches.updateTouch(event)
    if (currentInteractionState === InteractionState.touchPanZoom) {
      touchPanZoom()
    }
  }

  if (currentInteractionState === InteractionState.pan) {
    pan(event)
  }

  if (currentInteractionState === InteractionState.useTool) {
    const useCoalescedEvents = usePreferenceStore.getState().prefs.useCoalescedEvents

    let coalesced: PointerEvent[] | undefined
    if (PointerEvent.prototype.getCoalescedEvents !== undefined && useCoalescedEvents) {
      coalesced = event.getCoalescedEvents()

      if (coalesced !== undefined) {
        for (const coalescedEvent of coalesced) {
          const coalescedRelativeMouseState = calculatePointerWorldPosition(coalescedEvent)

          InteractionManager.process(coalescedRelativeMouseState)
        }
      }
    }

    // At least on some platforms and browsers it seems the main pointer event is not included in the coalesced events array

    // We check to see if there were no coalesced events or if the last coalesced event in the list matches the main event
    // Processing the main event here seems to help responsiveness on some devices
    if (
      coalesced === undefined ||
      (coalesced !== undefined &&
        coalesced.length >= 1 &&
        (coalesced[coalesced.length - 1].x !== position.x || coalesced[coalesced.length - 1].y !== position.y))
    ) {
      InteractionManager.process(position)
    }

    queueMicrotask(InteractionManager.executeOperation)
  }

  DrawingManager.beginDraw()

  event.stopPropagation()
}

function pointerup(event: PointerEvent) {
  idleTime = 0

  document.body.style.cursor = "default"

  Application.drawing = false
  Application.gl.canvas.releasePointerCapture(event.pointerId)

  if (event.pointerType === "touch") {
    DrawingManager.hideCursor()
    touches.removeTouch(event)
  } else {
    DrawingManager.showCursor()
  }

  if (currentInteractionState === InteractionState.useTool) {
    InteractionManager.endInteraction()
  }
  DrawingManager.pauseDrawNextFrame()

  reset()

  event.stopPropagation()
}

function wheel(event: WheelEvent) {
  currentInteractionState = InteractionState.zoom
  idleTime = 0

  DrawingManager.beginDraw()
  wheelZoom(event)
  wheelThrottle(DrawingManager.pauseDrawNextFrame)

  currentInteractionState = InteractionState.none

  event.stopPropagation()
}

function keyup(event: KeyboardEvent) {
  if (event.code === "Space" && event.type === "keyup") {
    reset()
  }
}

function pointercancel(event: PointerEvent) {
  DrawingManager.pauseDrawNextFrame()
  document.body.style.cursor = "default"

  event.stopPropagation()
}

function pointerout(event: PointerEvent) {
  DrawingManager.pauseDrawNextFrame()
  document.body.style.cursor = "default"

  event.stopPropagation()
}

function pointerleave(event: PointerEvent) {
  DrawingManager.pauseDrawNextFrame()
  document.body.style.cursor = "default"

  event.stopPropagation()
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
  event.stopPropagation()
}

const touch_listeners = {
  touchstart: ignoreEvent,
  touchcancel: ignoreEvent,
  touchdown: ignoreEvent,
  touchmove: ignoreEvent,
  touchend: ignoreEvent,
}

const mouse_listeners = {
  mouseenter: ignoreEvent,
  mouseleave: ignoreEvent,
  mouseout: ignoreEvent,
  mouseup: ignoreEvent,
  mouseover: ignoreEvent,
  mousedown: ignoreEvent,
  mousemove: ignoreEvent,
  mouseend: ignoreEvent,
}

function resize() {
  reset()
  idleTime = 0

  Application.resize()
  Camera.reset()
}

function windowResize() {
  DrawingManager.beginDraw()
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

  if (screen.orientation) {
    screen.orientation.addEventListener("change", windowResize)
  } else {
    window.addEventListener("deviceorientation", windowResize)
    window.addEventListener("orientationchange", windowResize)
  }
}

function reset() {
  startMidPoint.x = 0
  startMidPoint.y = 0
  lastMidPoint.x = 0
  lastMidPoint.y = 0
  prevTouchDistance = -1

  currentInteractionState = InteractionState.none
  document.body.style.cursor = "default"
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

  if (screen.orientation) {
    screen.orientation.removeEventListener("change", windowResize)
  } else {
    window.removeEventListener("deviceorientation", windowResize)
    window.removeEventListener("orientationchange", windowResize)
  }
}

export const InputManager = {
  resize,
  windowResize,
  init,
  destroy,
  reset,
}
