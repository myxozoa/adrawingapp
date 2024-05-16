import { Modifier, ModifierState } from "@/types"
import { key_modifers } from "@/constants"
import { isKeyboardEvent } from "@/utils/typeguards"

export const ModifierKeyManager: ModifierState = new Set()

function handleModifier(modifierState: ModifierState, addOrRemove: boolean, key: Modifier) {
  if (addOrRemove) {
    modifierState.add(key)
  } else {
    modifierState.delete(key)
  }
}

function handleKeys(event: KeyboardEvent) {
  if (!isKeyboardEvent(event)) return

  handleModifier(ModifierKeyManager, event.ctrlKey, key_modifers.ctrl)
  handleModifier(ModifierKeyManager, event.altKey, key_modifers.alt)
  handleModifier(ModifierKeyManager, event.shiftKey, key_modifers.shift)
  handleModifier(ModifierKeyManager, event.code === "Space" && event.type === "keydown", key_modifers.space)
}

document.addEventListener("keydown", handleKeys)
document.addEventListener("keyup", handleKeys)
