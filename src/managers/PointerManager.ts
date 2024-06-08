import type { MouseState, PointerType } from "@/types"
import { isPointerEvent } from "@/utils/typeguards"

export const PointerManager: MouseState = {
  x: 0,
  y: 0,
  leftMouseDown: false,
  rightMouseDown: false,
  middleMouseDown: false,
  pressure: 0,
  pointerType: "mouse",
}

function parseMouseButtons(event: PointerEvent | WheelEvent) {
  const buttons = event.buttons !== undefined ? event.buttons : event.which

  PointerManager.leftMouseDown = (buttons & 0b001) > 0
  PointerManager.rightMouseDown = (buttons & 0b010) > 0
  PointerManager.middleMouseDown = (buttons & 0b100) > 0
}

export const updatePointer = (event: PointerEvent | WheelEvent): MouseState => {
  parseMouseButtons(event)
  ;(PointerManager.x = event.x), (PointerManager.y = event.y)

  if (isPointerEvent(event)) {
    ;(PointerManager.x = event.offsetX), (PointerManager.y = event.offsetY)
    ;(PointerManager.pressure = event.pressure),
      (PointerManager.pointerType = event.pointerType as unknown as PointerType)
  }

  return PointerManager
}

export const resetPointerManager = () => {
  PointerManager.x = 0
  PointerManager.y = 0
  PointerManager.leftMouseDown = false
  PointerManager.rightMouseDown = false
  PointerManager.middleMouseDown = false
  PointerManager.pressure = 0
  PointerManager.pointerType = "mouse"
}
