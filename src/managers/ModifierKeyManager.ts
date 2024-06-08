"use client"

import type { Modifier, ModifierState } from "@/types"
import { key_modifers } from "@/constants"
import { isKeyboardEvent } from "@/utils/typeguards"

export const keys: ModifierState = new Set()

function handleModifier(modifierState: ModifierState, addOrRemove: boolean, key: Modifier) {
  if (addOrRemove) {
    modifierState.add(key)
  } else {
    modifierState.delete(key)
  }
}

function handleKeys(event: KeyboardEvent) {
  if (!isKeyboardEvent(event)) return

  handleModifier(keys, event.ctrlKey, key_modifers.ctrl)
  handleModifier(keys, event.altKey, key_modifers.alt)
  handleModifier(keys, event.shiftKey, key_modifers.shift)
  handleModifier(keys, event.code === "Space" && event.type === "keydown", key_modifers.space)
}

function init() {
  window.addEventListener("keydown", handleKeys)
  window.addEventListener("keyup", handleKeys)
}

function reset() {
  keys.clear()
}

export const ModifierKeyManager = {
  keys,
  init,
  reset,
}
