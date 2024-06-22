import type { PointerState } from "@/types"
import { tool_types } from "@/constants.tsx"
import { getDistance, calculateFromPressure, AppViewportSizeCache, calculateSpacing, lerp } from "@/utils/utils"
import { Application } from "@/managers/ApplicationManager"
import { getPointerSmoothing, getPreference } from "@/stores/PreferenceStore"
import { ResourceManager } from "@/managers/ResourceManager"
import { vec2 } from "gl-matrix"
import { DrawingManager, scratchLayerBoundingBox } from "@/managers/DrawingManager"
import { getCurrentLayer } from "@/stores/LayerStore"
import { Camera } from "@/objects/Camera"
import { canDraw, switchIfPossible, canUse } from "@/utils/typeguards"
import { useToolStore } from "@/stores/ToolStore"
import { LocationStorage } from "@/objects/utils"

const currentPointerPosition = new LocationStorage()
let mergeEvent = false
const mergeEventCache = new LocationStorage()

function prepareOperation(pointerState: PointerState) {
  if (DrawingManager.waitUntilInteractionEnd) return

  const operation = Application.currentOperation

  const prevPoint = operation.points.getPoint(-1).active ? operation.points.getPoint(-1) : operation.points.currentPoint

  operation.points.currentPoint.pointerType = pointerState.pointerType

  operation.points.currentPoint.pressure = lerp(
    operation.points.getPoint(-1).active ? prevPoint.pressure : 0,
    pointerState.pressure,
    getPreference("pressureSmoothing"),
  )

  const _size = "size" in operation.tool.settings ? operation.tool.settings.size : 0

  const spacing = "spacing" in operation.tool.settings ? operation.tool.settings.spacing : 0
  const usePressure = getPreference("usePressure")
  const basePressure = usePressure && pointerState.pointerType === "pen"

  const size = calculateFromPressure(
    _size / 2,
    operation.points.currentPoint.pressure,
    basePressure && "sizePressure" in operation.tool.settings && operation.tool.settings.sizePressure,
  )

  const stampSpacing = calculateSpacing(spacing, size)

  if (operation.tool.name === "PENCIL" || operation.tool.name === "EYEDROPPER") {
    operation.points.currentPoint.x = Math.trunc(pointerState.x) + 0.5
    operation.points.currentPoint.y = Math.trunc(pointerState.y) + 0.5
  } else {
    operation.points.currentPoint.x = pointerState.x
    operation.points.currentPoint.y = pointerState.y
  }

  let zoomAdjustment = 0

  // To counteract the fact that the pointer position resolution gets much lower the
  // more zoomed out the canvas becomes we raise smoothing to compensate
  if (Camera.zoom < 1 && getPreference("zoomCompensation")) {
    // These values are just tuned to feel right

    zoomAdjustment = Math.min((1 - Camera.zoom) * 0.7, getPointerSmoothing() * 0.8)
  }

  vec2.lerp(
    operation.points.currentPoint.location,
    prevPoint.location,
    operation.points.currentPoint.location,
    Math.min(Math.max(getPointerSmoothing() - zoomAdjustment, 0.01), 0.98),
  )

  // If the new point is too close we don't commit to it and wait until the next one and blend it with the previous
  if (mergeEvent) {
    operation.points.currentPoint.x = lerp(mergeEventCache.x, operation.points.currentPoint.x, 0.5)
    operation.points.currentPoint.y = lerp(mergeEventCache.y, operation.points.currentPoint.y, 0.5)

    mergeEvent = false
  }

  mergeEventCache.x = operation.points.currentPoint.x
  mergeEventCache.y = operation.points.currentPoint.y

  const dist = getDistance(prevPoint, operation.points.currentPoint)

  if (Application.drawing) {
    switch (operation.tool.type) {
      case tool_types.STROKE:
        if (!prevPoint.active || (prevPoint.active && dist >= stampSpacing / 3)) {
          operation.points.currentPoint.active = true

          operation.points.nextPoint()

          operation.readyToDraw = true
        } else {
          mergeEvent = true
        }
        break

      case tool_types.POINT:
        DrawingManager.waitUntilInteractionEnd = true

        operation.points.updateCurrentPoint(null, pointerState.x, pointerState.y)

        operation.points.currentPoint.active = true

        operation.points.nextPoint()

        operation.readyToDraw = true
        break
    }
  }
}

function executeOperation() {
  const operation = Application.currentOperation
  if (!operation.readyToDraw) return

  const gl = Application.gl

  Application.gl.viewport(0, 0, Application.canvasInfo.width, Application.canvasInfo.height)
  Application.gl.scissor(0, 0, Application.canvasInfo.width, Application.canvasInfo.height)

  // TODO: More elegant solution here
  if (operation.tool.name === "EYEDROPPER") {
    gl.bindFramebuffer(gl.FRAMEBUFFER, ResourceManager.get("DisplayLayer").bufferInfo?.framebuffer)
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, ResourceManager.get("ScratchLayer").bufferInfo?.framebuffer)
  }

  if (switchIfPossible(operation.tool)) operation.tool.switchTo(gl)

  if (canUse(operation.tool)) operation.tool.use(gl, operation)
  if (canDraw(operation.tool)) operation.tool.draw(gl, operation)

  DrawingManager.recomposite()
}

function process(pointerState: PointerState) {
  const gl = Application.gl

  gl.viewport(0, 0, AppViewportSizeCache.width, AppViewportSizeCache.height)

  prepareOperation(pointerState)
}

/**
 * Resets everything releated to the current operation
 *
 * Should be called whenever the user completes something (finishes drawing a stroke in some way, clicks the canvas, etc)
 *
 * @param save this determines whether to add the completed interation to the undo history (defaults to true)
 */
function endInteraction(save = true) {
  const currentTool = useToolStore.getState().currentTool
  mergeEvent = false

  const scratchLayer = ResourceManager.get("ScratchLayer")

  // TODO: More elegant solution here
  if (save && Application.currentOperation.tool.name !== "EYEDROPPER") {
    const currentLayer = ResourceManager.get(`Layer${getCurrentLayer().id}`)

    DrawingManager.commitLayer(scratchLayer, currentLayer, currentLayer)
  }
  DrawingManager.clearSpecific(scratchLayer)

  DrawingManager.fullyRecomposite()
  DrawingManager.pauseDrawNextFrame()

  DrawingManager.waitUntilInteractionEnd = false

  Application.currentOperation.reset()
  scratchLayerBoundingBox.reset()

  currentTool.end()
}

function reset() {
  currentPointerPosition.reset()
  mergeEvent = false
  mergeEventCache.reset()
}

export const InteractionManager = {
  currentPointerPosition,
  endInteraction,
  process,
  executeOperation,
  reset,
}
