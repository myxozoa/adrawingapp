import { MouseState, PointerType } from "@/types"

export const PointerManager: MouseState = {
  x: 0,
  y: 0,
  leftMouseDown: false,
  rightMouseDown: false,
  middleMouseDown: false,
  pressure: 0,
  pointerType: "pen",
}

function isPointerEvent(event: Event): event is PointerEvent {
  return event instanceof PointerEvent
}

function parseMouseButtons(event: PointerEvent | WheelEvent) {
  const buttons = event.buttons !== undefined ? event.buttons : event.which

  PointerManager.leftMouseDown = (buttons & 0b001) > 0
  PointerManager.rightMouseDown = (buttons & 0b010) > 0
  PointerManager.middleMouseDown = (buttons & 0b100) > 0
}

export const updatePointer = (event: PointerEvent | WheelEvent): MouseState => {
  parseMouseButtons(event)
  ;(PointerManager.x = event.clientX), (PointerManager.y = event.clientY)

  if (isPointerEvent(event)) {
    ;(PointerManager.pressure = event.pressure),
      (PointerManager.pointerType = event.pointerType as unknown as PointerType)
  }

  return PointerManager
}
