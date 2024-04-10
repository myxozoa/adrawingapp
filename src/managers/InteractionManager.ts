import { DrawingManager } from "@/managers/DrawingManager"
import { updatePointer } from "@/managers/PointerManager"
import { Camera } from "@/objects/Camera"
import {
  isPointerEvent,
  throttleRAF,
  resizeCanvasToDisplaySize,
  getRelativeMousePosition,
  lerp,
  toClipSpace,
  getDistance,
} from "@/utils"
import { isKeyboardEvent } from "@/utils"

import { ModifierKeyManager } from "@/managers/ModifierKeyManager"

import { vec2, mat3 } from "gl-matrix"

const wheelThrottle = throttleRAF()
const resizeThrottle = throttleRAF()
const renderThrottle = throttleRAF()

let touchCache: PointerEvent[] = []
let prevTouchDistance = -1

const startCamPosition = { x: 0, y: 0 }
const startPos = { x: 0, y: 0 }
const startInvViewProjMat: mat3 = mat3.create()
const tempPos = vec2.create()
let zoomTarget = 0
let startMoving = false

function removeEvent(event: PointerEvent) {
  const index = touchCache.findIndex((cachedEv) => cachedEv.pointerId === event.pointerId)
  touchCache.splice(index, 1)
}

function wheelZoom(event: Event) {
  function isWheelEvent(event: Event): event is WheelEvent {
    return event instanceof WheelEvent
  }

  if (!isWheelEvent(event)) return

  const gl = DrawingManager.gl

  const pointerState = updatePointer(event)

  const relativeMouseState = getRelativeMousePosition(gl.canvas as HTMLCanvasElement, pointerState)

  if (event.deltaY) {
    zoomTarget = Camera.zoom * Math.pow(2, event.deltaY * -0.006)
  }

  zoom(relativeMouseState, true)
}

function pinchZoom() {
  const touch1 = { x: touchCache[0].clientX, y: touchCache[0].clientY }
  const touch2 = { x: touchCache[1].clientX, y: touchCache[1].clientY }

  const midPoint = getRelativeMousePosition(DrawingManager.gl.canvas as HTMLCanvasElement, {
    x: (touch1.x + touch2.x) / 2,
    y: (touch1.y + touch2.y) / 2,
  })

  const distance = getDistance(touch1, touch2)

  if (prevTouchDistance > 0) {
    zoomTarget = Camera.zoom / (prevTouchDistance / distance)

    zoom(midPoint, false)
  }

  prevTouchDistance = distance

  return
}

function zoom(pointerPosition: { x: number; y: number }, lerpZoom: boolean) {
  const gl = DrawingManager.gl

  const mousePositionBeforeZoom = Camera.getWorldMousePosition(pointerPosition, gl)

  let tempZoom = zoomTarget

  if (lerpZoom) {
    const zoomLerpAmount = 0.1

    tempZoom = lerp(Camera.zoom, zoomTarget, zoomLerpAmount)
  }

  Camera.zoom = Math.max(0.001, Math.min(30, tempZoom))

  const mousePositionAfterZoom = Camera.getWorldMousePosition(pointerPosition, gl)

  const zoomXOffset = mousePositionBeforeZoom[0] - mousePositionAfterZoom[0]

  const zoomYOffset = mousePositionBeforeZoom[1] - mousePositionAfterZoom[1]

  // Zoom Repositioning
  Camera.x += zoomXOffset
  Camera.y += zoomYOffset

  if (Math.abs(Camera.zoom - zoomTarget) < 0.001) {
    zoomTarget = 0
  }

  Camera.updateViewProjectionMatrix(gl)

  DrawingManager.swapPixelInterpolation()

  renderThrottle(DrawingManager.render)
}

function pan(event: Event) {
  if (!isPointerEvent(event)) return

  const gl = DrawingManager.gl

  const pointerState = updatePointer(event)

  const relativeMouseState = getRelativeMousePosition(gl.canvas as HTMLCanvasElement, pointerState)

  const clipSpaceMousePosition = toClipSpace(relativeMouseState, DrawingManager.gl.canvas as HTMLCanvasElement)

  if (relativeMouseState.leftMouseDown) {
    if (startMoving) {
      vec2.transformMat3(tempPos, clipSpaceMousePosition, startInvViewProjMat)

      const panLerpAmount = 0.6
      Camera.x = lerp(Camera.x, startCamPosition.x + (startPos.x - tempPos[0]), panLerpAmount)
      Camera.y = lerp(Camera.y, startCamPosition.y + (startPos.y - tempPos[1]), panLerpAmount)
    } else {
      startMoving = true

      mat3.copy(startInvViewProjMat, Camera.getInverseViewProjectionMatrix())

      vec2.transformMat3(tempPos, clipSpaceMousePosition, startInvViewProjMat)

      startCamPosition.x = Camera.x
      startCamPosition.y = Camera.y

      startPos.x = tempPos[0]
      startPos.y = tempPos[1]
    }
  }

  Camera.updateViewProjectionMatrix(gl)

  renderThrottle(DrawingManager.render)
}

function pointerdown(event: Event) {
  if (!isPointerEvent(event)) return
  ;(DrawingManager.gl.canvas as HTMLCanvasElement).setPointerCapture(event.pointerId)

  touchCache.push(event)

  const pointerState = updatePointer(event)

  if (ModifierKeyManager.has("space")) pan(event)
  else DrawingManager.beginDraw(pointerState)
}

function pointermove(event: Event) {
  if (!isPointerEvent(event)) return

  const pointerState = updatePointer(event)

  if (ModifierKeyManager.has("space")) {
    if ((DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor !== "grab") {
      ;(DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor = "grab"
    }

    pan(event)

    return
  }

  if ((DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor == "grab") {
    ;(DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor = "crosshair"
  }

  const index = touchCache.findIndex((cachedEv) => cachedEv.pointerId === event.pointerId)
  touchCache[index] = event

  if (touchCache.length === 2) {
    pinchZoom()
  }

  if (PointerEvent.prototype.getCoalescedEvents !== undefined) {
    const coalesced = event.getCoalescedEvents()

    for (const coalescedEvent of coalesced) {
      const coalescedEventPointerState = updatePointer(coalescedEvent)
      DrawingManager.continueDraw(coalescedEventPointerState)
    }
  } else {
    DrawingManager.continueDraw(pointerState)
  }
}

function pointerup(event: Event) {
  if (!isPointerEvent(event)) return

  DrawingManager.drawing = false
  ;(DrawingManager.gl.canvas as HTMLCanvasElement).releasePointerCapture(event.pointerId)

  removeEvent(event)

  if (touchCache.length < 2) {
    prevTouchDistance = -1
  }

  reset()
  DrawingManager.endInteraction()
}

function wheel(event: Event) {
  wheelThrottle(() => wheelZoom(event))
}

function keyup(event: Event) {
  if (!isKeyboardEvent(event)) return

  if (event.code === "Space" && event.type === "keyup") {
    ;(DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor = "crosshair"

    reset()
  }
}

// function touchstart(event: Event) {
//   if (!isTouchEvent(event)) return

//   event.preventDefault()
//   // Cache the touch points for later processing of 2-touch pinch/zoom
//   if (event.targetTouches.length === 2) {
//     for (const touch of event.targetTouches) {
//       touchCache.push(touch)
//     }
//   }
// }

// function touchmove(event: Event) {
//   if (!isTouchEvent(event)) return

//   if (event.targetTouches.length === 2 && event.changedTouches.length === 2) {
//     // Check if the two target touches are the same ones that started
//     // the 2-touch
//     const point1 = touchCache.findIndex((tp) => tp.identifier === event.targetTouches[0].identifier)
//     const point2 = touchCache.findIndex((tp) => tp.identifier === event.targetTouches[1].identifier)

//     if (point1 >= 0 && point2 >= 0) {
//       // Calculate the difference between the start and move coordinates
//       const diff1 = Math.abs(touchCache[point1].clientX - event.targetTouches[0].clientX)
//       const diff2 = Math.abs(touchCache[point2].clientX - event.targetTouches[1].clientX)

//       // This threshold is device dependent as well as application specific
//       const PINCH_THRESHOLD = (event.target as HTMLCanvasElement).clientWidth / 100
//       if (diff1 >= PINCH_THRESHOLD && diff2 >= PINCH_THRESHOLD) console.log("did this work??")
//     } else {
//       // empty touchCache
//       touchCache = []
//     }
//   }
// }

const listeners = {
  pointerdown,
  pointermove,
  pointerup,
  wheel,
  keyup,
}

function windowResize() {
  resizeThrottle(() => {
    const resize = () => {
      resizeCanvasToDisplaySize(DrawingManager.canvasRef.current, () => (DrawingManager.needRedraw = true))

      Camera.updateViewProjectionMatrix(DrawingManager.gl)
      DrawingManager.render()
    }

    resize()

    // Device rotation hack
    setTimeout(resize, 1)
  })
}

function init() {
  for (const [name, callback] of Object.entries(listeners)) {
    DrawingManager.gl.canvas.addEventListener(name, callback, { capture: true, passive: true })
  }

  window.addEventListener("resize", windowResize)
  screen.orientation.addEventListener("change", windowResize)
}

function reset() {
  startMoving = false
  startCamPosition.x = 0
  startCamPosition.y = 0
  startPos.x = 0
  startPos.y = 0
  touchCache = []
  prevTouchDistance = -1
  mat3.identity(startInvViewProjMat)
}

function destroy() {
  for (const [name, callback] of Object.entries(listeners)) {
    DrawingManager.gl.canvas.removeEventListener(name, callback)
  }

  window.removeEventListener("resize", windowResize)
  screen.orientation.removeEventListener("change", windowResize)
}

export const InteractionManager = {
  init,
  destroy,
}
