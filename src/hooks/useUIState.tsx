import { useEffect, useRef } from "react"

import { key_modifers } from "../constants"

import { MouseState, Modifier, ModifierState, WheelState, UIInteraction, PointerType } from "../types"

const defaultInteraction: UIInteraction = {
  mouseState: {
    x: 0,
    y: 0,
    leftMouseDown: false,
    rightMouseDown: false,
    middleMouseDown: false,
    pressure: 0,
    pointerType: "pen",
  },
  modifierState: new Set(),
  wheelState: {
    wheel: 0,
  },
}

function constructInteraction(
  mouseState: React.MutableRefObject<MouseState>,
  modifierState: React.MutableRefObject<ModifierState>,
  wheelState: React.MutableRefObject<WheelState>,
): UIInteraction {
  return {
    mouseState: mouseState.current,
    modifierState: modifierState.current,
    wheelState: wheelState.current,
  }
}

function handleModifier(modifierState: React.MutableRefObject<ModifierState>, addOrRemove: boolean, key: Modifier) {
  if (addOrRemove) {
    modifierState.current.add(key)
  } else {
    modifierState.current.delete(key)
  }
}

function parseMouseButtons(event: PointerEvent) {
  const buttons = event.buttons !== undefined ? event.buttons : event.which
  const leftMouseDown = (buttons & 0b001) > 0
  const rightMouseDown = (buttons & 0b010) > 0
  const middleMouseDown = (buttons & 0b100) > 0

  return { leftMouseDown, middleMouseDown, rightMouseDown }
}

function isKeyboardEvent(event: Event): event is KeyboardEvent {
  return event instanceof KeyboardEvent
}

function isWheelEvent(event: Event): event is WheelEvent {
  return event instanceof WheelEvent
}

function isPointerEvent(event: Event): event is PointerEvent {
  return event instanceof PointerEvent
}

function useUIState(callbackUndo: (...args: any[]) => void) {
  const mouseState = useRef(defaultInteraction.mouseState)
  const wheelState = useRef(defaultInteraction.wheelState)
  const modifierState = useRef(defaultInteraction.modifierState)
  // const commandState = useRef({ ctrlZ: false })

  const currentUIInteraction = useRef({ ...defaultInteraction }) as React.MutableRefObject<UIInteraction>
  // const prevInteraction = useRef({...defaultInteraction})

  useEffect(() => {
    const updatePointer = (event: Event) => {
      if (!isPointerEvent(event) || (event.target as HTMLElement).nodeName !== "CANVAS") return

      const mouseButtons = parseMouseButtons(event)

      mouseState.current = {
        x: event.clientX,
        y: event.clientY,
        ...mouseButtons,
        pressure: event.pressure,
        pointerType: event.pointerType as unknown as PointerType,
      }

      currentUIInteraction.current = constructInteraction(mouseState, modifierState, wheelState)
    }

    const onPointerUp = (event: Event) => {
      if (!isPointerEvent(event)) return

      updatePointer(event)
    }

    const updateWheelDeltaY = (event: Event) => {
      if (!isWheelEvent(event)) return

      wheelState.current.wheel = event.deltaY
    }

    const updateKeyModifiers = (event: Event) => {
      if (!isKeyboardEvent(event)) return

      handleModifier(modifierState, event.ctrlKey, key_modifers.ctrl)
      handleModifier(modifierState, event.altKey, key_modifers.alt)
      handleModifier(modifierState, event.shiftKey, key_modifers.shift)
      handleModifier(modifierState, event.code === "Space" && event.type === "keydown", key_modifers.space)

      currentUIInteraction.current = constructInteraction(mouseState, modifierState, wheelState)
    }

    const updateKeys = (event: Event) => {
      if (!isKeyboardEvent(event)) return

      updateKeyModifiers(event)

      if (event.code === "z" && event.ctrlKey) callbackUndo()
    }

    const mapping = {
      pointermove: updatePointer,
      pointerdown: updatePointer,
      pointerup: onPointerUp,
      wheel: updateWheelDeltaY,
      keydown: updateKeys,
      keyup: updateKeys,
    }

    for (const [name, callback] of Object.entries(mapping)) {
      document.addEventListener(name, callback)
    }

    return () => {
      for (const [name, callback] of Object.entries(mapping)) {
        document.removeEventListener(name, callback)
      }
    }
  }, [])

  return { currentUIInteraction }
}

export default useUIState
