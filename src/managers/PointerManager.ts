import type { PointerState, PointerType } from "@/types"
import { isPointerEvent } from "@/utils/typeguards"

import { LocationStorage } from "@/objects/utils"

export const PointerOffsetDifferenceCache = {
  cache: new LocationStorage(),
  cacheRefresh: true,
}

class _PointerManager extends LocationStorage {
  leftMouseDown: boolean
  rightMouseDown: boolean
  middleMouseDown: boolean
  pressure: number
  pointerType: PointerType

  constructor() {
    super()

    this.leftMouseDown = false
    this.rightMouseDown = false
    this.middleMouseDown = false
    this.pressure = 0
    this.pointerType = "mouse"
  }
}

function updateCache(event: PointerEvent) {
  if (PointerOffsetDifferenceCache.cacheRefresh) {
    PointerOffsetDifferenceCache.cache.x = event.x - event.offsetX
    PointerOffsetDifferenceCache.cache.y = event.y - event.offsetY

    PointerOffsetDifferenceCache.cacheRefresh = false
  }
}

export const PointerManager = new _PointerManager()

function parseMouseButtons(event: PointerEvent | WheelEvent) {
  const buttons = event.buttons !== undefined ? event.buttons : event.which

  PointerManager.leftMouseDown = (buttons & 0b001) > 0
  PointerManager.rightMouseDown = (buttons & 0b010) > 0
  PointerManager.middleMouseDown = (buttons & 0b100) > 0
}

export const updatePointer = (event: PointerEvent | WheelEvent): PointerState => {
  parseMouseButtons(event)
  ;(PointerManager.x = event.x), (PointerManager.y = event.y)

  if (isPointerEvent(event)) {
    updateCache(event)
    ;(PointerManager.x = event.x - PointerOffsetDifferenceCache.cache.x),
      (PointerManager.y = event.y - PointerOffsetDifferenceCache.cache.y)
    ;(PointerManager.pressure = event.pressure),
      (PointerManager.pointerType = event.pointerType as unknown as PointerType)
  }

  return PointerManager
}

export const resetPointerManager = () => {
  PointerManager.x = 0
  PointerManager.y = 0
  PointerManager.leftMouseDown = false
  PointerManager.rightMouseDown = false
  PointerManager.middleMouseDown = false
  PointerManager.pressure = 0
  PointerManager.pointerType = "mouse"
}
