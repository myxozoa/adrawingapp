import { AvailableTools, IBrush, IEraser, IEyedropper, IFill, IPoint } from "@/types"

export function isPointerEvent(event: Event): event is PointerEvent {
  return event instanceof PointerEvent
}

export function isPointerEventOrLocation(event: PointerEvent | { x: number; y: number }): event is PointerEvent {
  return event instanceof PointerEvent
}

export function isKeyboardEvent(event: Event): event is KeyboardEvent {
  return event instanceof KeyboardEvent
}

export function isTouchEvent(event: Event): event is TouchEvent {
  return event instanceof TouchEvent
}

export function isWheelEvent(event: Event): event is WheelEvent {
  return event instanceof WheelEvent
}

export function isBrush(tool: AvailableTools): tool is IBrush {
  return tool.name === "BRUSH"
}

export function isEraser(tool: AvailableTools): tool is IEraser {
  return tool.name === "ERASER"
}

export function switchIfPossible(tool: AvailableTools): tool is IBrush & IEraser {
  return "switchTo" in tool
}

export function useIfPossible(tool: AvailableTools): tool is IEyedropper & IFill {
  return "use" in tool
}

export function drawIfPossible(tool: AvailableTools): tool is IBrush & IEraser {
  return "draw" in tool
}

export function isPoint(point: IPoint | { x: number; y: number }): point is IPoint {
  return "location" in point
}
