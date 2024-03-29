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
  const leftMouseDown = (buttons & 0b001) > 0
  const rightMouseDown = (buttons & 0b010) > 0
  const middleMouseDown = (buttons & 0b100) > 0

  return { leftMouseDown, middleMouseDown, rightMouseDown }
}

export const updatePointer = (event: PointerEvent | WheelEvent): MouseState => {
  const mouseButtons = parseMouseButtons(event)

  ;(PointerManager.x = event.clientX),
    (PointerManager.y = event.clientY),
    (PointerManager.leftMouseDown = mouseButtons.leftMouseDown),
    (PointerManager.middleMouseDown = mouseButtons.middleMouseDown),
    (PointerManager.rightMouseDown = mouseButtons.rightMouseDown)

  if (isPointerEvent(event)) {
    ;(PointerManager.pressure = event.pressure),
      (PointerManager.pointerType = event.pointerType as unknown as PointerType)
  }

  return PointerManager
}
