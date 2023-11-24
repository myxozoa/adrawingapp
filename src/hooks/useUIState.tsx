import { useEffect, useRef } from 'react'

import { key_modifers } from '../constants'

const defaultInteraction = { mouseState: {}, keyModifiers: [], wheelDeltaY: 0 }
8
function constructInteraction(mouseState, modifierState, wheelDeltaY) {
  const interaction = { 
    mouseState: mouseState.current,
    modifierState: modifierState.current,
    wheelDeltaY
 }

 return interaction
}

function handleModifier(modifierState, addOrRemove, key) {
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

function useUIState(callbackUp, callbackUndo) {
  const mouseState = useRef({ x: null, y: null })
  const modifierState = useRef(new Set())
  const commandState = useRef({ ctrlZ: false })
  const wheelDeltaY = useRef(0)

  // Derived
  const currentInteraction = useRef({...defaultInteraction})
  // const prevInteraction = useRef({...defaultInteraction})

  useEffect(() => {
    const updatePointer = (event: PointerEvent) => {
      // requestAnimationFrame(() => prevInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY))
      
      const mouseButtons = parseMouseButtons(event)
      
      mouseState.current = { x: event.clientX, y: event.clientY, ...mouseButtons, pressure: event.pressure, pointerType: event.pointerType }
      
      currentInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const onPointerUp = (event: PointerEvent) => {
      updatePointer(event)
      callbackUp(event)
    }

    const updateWheelDeltaY = (event: WheelEvent) => {
      wheelDeltaY.current = event.deltaY

      currentInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const updateKeyModifiers = (event: KeyboardEvent) => {
      handleModifier(modifierState, event.ctrlKey, key_modifers.ctrl)
      handleModifier(modifierState, event.altKey, key_modifers.alt)
      handleModifier(modifierState, event.shiftKey, key_modifers.key)

      currentInteraction.current = constructInteraction(mouseState, modifierState, wheelDeltaY)
    }

    const updateKeys = (event: KeyboardEvent) => {
      updateKeyModifiers(event)

      if (event.keyCode == 90 && event.ctrlKey) callbackUndo()
    }

    document.addEventListener('pointermove', updatePointer)
    document.addEventListener('pointerdown', updatePointer)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointerout ', onPointerUp)
    document.addEventListener('wheel', updateWheelDeltaY)
    document.addEventListener('keydown', updateKeys)
    document.addEventListener('keyup', updateKeys)

    return () => {
      document.removeEventListener('pointermove', updatePointer)
      document.removeEventListener('pointerdown', updatePointer)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointerout', onPointerUp)
      document.removeEventListener('wheel', updateWheelDeltaY)
    document.removeEventListener('keydown', updateKeys)
    document.removeEventListener('keyup', updateKeys)
    }
  }, [])

  return { currentInteraction }

}

export default useUIState
