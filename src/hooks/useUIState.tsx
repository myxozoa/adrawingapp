import { useEffect, useRef } from 'react'

import { key_modifers } from '../constants'

import { MouseState, Modifier, ModifierState, UIInteraction, PointerType } from '../types'

const defaultInteraction: UIInteraction = { mouseState: {}, keyModifiers: [], wheelDeltaY: 0 } as unknown as UIInteraction
8
function constructInteraction(mouseState: React.MutableRefObject<MouseState>, modifierState: React.MutableRefObject<ModifierState>, wheelDeltaY: React.MutableRefObject<number>): UIInteraction {
  const interaction = { 
    mouseState: mouseState.current,
    modifierState: modifierState.current,
    wheelDeltaY: wheelDeltaY.current
 }

 return interaction
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

  return {leftMouseDown, middleMouseDown, rightMouseDown}
}

function useUIState(callbackUp: (...args: any[]) => void, callbackUndo: (...args: any[]) => void) {
  const mouseState = useRef({}) as React.MutableRefObject<MouseState>
  const modifierState = useRef(new Set()) as React.MutableRefObject<ModifierState>
  // const commandState = useRef({ ctrlZ: false })
  const wheelDeltaY = useRef({}) as React.MutableRefObject<number>

  const currentUIInteraction = useRef({ ...defaultInteraction }) as React.MutableRefObject<UIInteraction>
  // const prevInteraction = useRef({...defaultInteraction})

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {      
      const mouseButtons = parseMouseButtons(event)
      
      mouseState.current = {
        x: event.clientX,
        y: event.clientY,
        ...mouseButtons,
        pressure: event.pressure,
        pointerType: event.pointerType as unknown as PointerType }
      
      currentUIInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const onPointerUp = (event: PointerEvent) => {
      updatePointer(event)
      callbackUp(event)
    }

    const updateWheelDeltaY = (event: WheelEvent) => {
      wheelDeltaY.current = event.deltaY

      currentUIInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const updateKeyModifiers = (event: KeyboardEvent) => {
      handleModifier(modifierState, event.ctrlKey, key_modifers.ctrl)
      handleModifier(modifierState, event.altKey, key_modifers.alt)
      handleModifier(modifierState, event.shiftKey, key_modifers.shift)

      currentUIInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const updateKeys = (event: KeyboardEvent) => {
      updateKeyModifiers(event)

      if (event.keyCode == 90 && event.ctrlKey) callbackUndo()
    }

    document.addEventListener('pointermove', updatePointer)
    document.addEventListener('pointerdown', updatePointer)
    document.addEventListener('pointerup', onPointerUp)
    // document.addEventListener('pointerout', onPointerUp)
    document.addEventListener('wheel', updateWheelDeltaY)
    document.addEventListener('keydown', updateKeys)
    document.addEventListener('keyup', updateKeys)

    return () => {
      document.removeEventListener('pointermove', updatePointer)
      document.removeEventListener('pointerdown', updatePointer)
      document.removeEventListener('pointerup', onPointerUp)
      // document.removeEventListener('pointerout', onPointerUp)
      document.removeEventListener('wheel', updateWheelDeltaY)
    document.removeEventListener('keydown', updateKeys)
    document.removeEventListener('keyup', updateKeys)
    }
  }, [])

  return { currentUIInteraction }

}

export default useUIState
