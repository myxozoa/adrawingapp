import { useEffect, useRef } from "react"

import { key_modifers } from "../constants"

import { MouseState, Modifier, ModifierState, UIInteraction, PointerType } from "../types"

const defaultInteraction: UIInteraction = {
  mouseState: {},
  keyModifiers: [],
  wheelDeltaY: 0,
} as unknown as UIInteraction

function constructInteraction(
  mouseState: React.MutableRefObject<MouseState>,
  modifierState: React.MutableRefObject<ModifierState>,
  wheelDeltaY: React.MutableRefObject<number>,
): UIInteraction {
  return {
    mouseState: mouseState.current,
    modifierState: modifierState.current,
    wheelDeltaY: wheelDeltaY.current,
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
  const flags = event.buttons !== undefined ? event.buttons : event.which
  const leftMouseDown = flags === 1
  const rightMouseDown = flags === 2
  const middleMouseDown = flags === 4

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
  const mouseState = useRef({}) as React.MutableRefObject<MouseState>
  const modifierState = useRef(new Set()) as React.MutableRefObject<ModifierState>
  // const commandState = useRef({ ctrlZ: false })
  const wheelDeltaY = useRef({}) as React.MutableRefObject<number>

  const currentUIInteraction = useRef({ ...defaultInteraction }) as React.MutableRefObject<UIInteraction>
  // const prevInteraction = useRef({...defaultInteraction})

  useEffect(() => {
    const updatePointer = (event: Event) => {
      if (!isPointerEvent(event)) return

      const mouseButtons = parseMouseButtons(event)

      mouseState.current = {
        x: event.clientX,
        y: event.clientY,
        ...mouseButtons,
        pressure: event.pressure,
        pointerType: event.pointerType as unknown as PointerType,
      }

      currentUIInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const onPointerUp = (event: Event) => {
      if (!isPointerEvent(event)) return

      updatePointer(event)
    }

    const updateWheelDeltaY = (event: Event) => {
      if (!isWheelEvent(event)) return

      wheelDeltaY.current = event.deltaY

      currentUIInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const updateKeyModifiers = (event: Event) => {
      if (!isKeyboardEvent(event)) return

      handleModifier(modifierState, event.ctrlKey, key_modifers.ctrl)
      handleModifier(modifierState, event.altKey, key_modifers.alt)
      handleModifier(modifierState, event.shiftKey, key_modifers.shift)

      currentUIInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const updateKeys = (event: Event) => {
      if (!isKeyboardEvent(event)) return

      updateKeyModifiers(event)

      if (event.keyCode == 90 && event.ctrlKey) callbackUndo()
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
