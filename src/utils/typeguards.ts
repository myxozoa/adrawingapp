import type { AvailableTools, IBrush, IEraser, IEyedropper, IFill, IPoint } from "@/types"

export function isPointerEvent(event: Event): event is PointerEvent {
  return "pointerId" in event
}

export function isKeyboardEvent(event: Event): event is KeyboardEvent {
  return "keyCode" in event
}

export function isTouchEvent(event: Event): event is TouchEvent {
  return "touches" in event
}

export function isWheelEvent(event: Event): event is WheelEvent {
  return "deltaY" in event
}

export function isBrush(tool: AvailableTools): tool is IBrush {
  return tool.name === "BRUSH"
}

export function isEraser(tool: AvailableTools): tool is IEraser {
  return tool.name === "ERASER"
}

export function switchIfPossible(tool: AvailableTools): tool is IBrush {
  return "switchTo" in tool
}

export function canUse(tool: AvailableTools): tool is IEyedropper & IFill {
  return "use" in tool
}

export function canDraw(tool: AvailableTools): tool is IBrush {
  return "draw" in tool
}

export function isPoint(point: IPoint | { x: number; y: number }): point is IPoint {
  return "location" in point
}
