import type { MouseState } from "@/types"
import { tool_types } from "@/constants.tsx"
import { getDistance, calculateFromPressure, CanvasSizeCache, calculateSpacing, lerp } from "@/utils/utils"
import { Application } from "@/managers/ApplicationManager"
import { usePreferenceStore } from "@/stores/PreferenceStore"
import { ResourceManager } from "@/managers/ResourceManager"
import { vec2 } from "gl-matrix"
import { DrawingManager, scratchLayerBoundingBox } from "@/managers/DrawingManager"
import { useLayerStore } from "@/stores/LayerStore"
import { Camera } from "@/objects/Camera"
import { canDraw, switchIfPossible, canUse } from "@/utils/typeguards"
import { useToolStore } from "@/stores/ToolStore"
import { LocationStorage } from "@/objects/utils"

const currentMousePosition = new LocationStorage()
let mergeEvent = false
const mergeEventCache = new LocationStorage()

function prepareOperation(relativeMouseState: MouseState) {
  if (DrawingManager.waitUntilInteractionEnd) return

  const operation = Application.currentOperation

  const prefs = usePreferenceStore.getState().prefs

  const prevPoint = operation.points.getPoint(-1).active ? operation.points.getPoint(-1) : operation.points.currentPoint

  let zoomAdjustment = 0

  // To counteract the fact that the pointer position resolution gets much lower the
  // more zoomed out the canvas becomes we raise smoothing to compensate
  if (Camera.zoom < 1 && prefs.zoomCompensation) {
    // These values are just tuned to feel right

    zoomAdjustment = Math.min((1 - Camera.zoom) * 0.1, 0.05)
  }

  operation.points.currentPoint.pointerType = relativeMouseState.pointerType

  operation.points.currentPoint.pressure = lerp(
    operation.points.getPoint(-1).active ? prevPoint.pressure : 0,
    relativeMouseState.pressure,
    prefs.pressureSmoothing,
  )

  const _size = "size" in operation.tool.settings ? operation.tool.settings.size : 0

  const spacing = "spacing" in operation.tool.settings ? operation.tool.settings.spacing : 0
  const usePressure = usePreferenceStore.getState().prefs.usePressure
  const basePressure = usePressure && relativeMouseState.pointerType === "pen"

  const size = calculateFromPressure(
    _size / 2,
    operation.points.currentPoint.pressure,
    basePressure && "sizePressure" in operation.tool.settings && operation.tool.settings.sizePressure,
  )

  const stampSpacing = calculateSpacing(spacing, size)

  // These values are just tuned to feel right
  const maxSmoothAdjustment = Math.max(0.8 - (1 - prefs.mouseSmoothing), 0)

  let pointerPositionLerpAdjustment = Camera.zoom < 1 ? Math.min((1 - Camera.zoom) * 0.7, maxSmoothAdjustment) : 0

  if (relativeMouseState.pointerType === "mouse" || relativeMouseState.pointerType === "touch")
    pointerPositionLerpAdjustment += 0.1

  operation.points.currentPoint.x = relativeMouseState.x
  operation.points.currentPoint.y = relativeMouseState.y

  vec2.lerp(
    operation.points.currentPoint.location,
    prevPoint.location,
    operation.points.currentPoint.location,
    Math.min(Math.max(prefs.mouseSmoothing - pointerPositionLerpAdjustment - zoomAdjustment, 0.01), 1),
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

        operation.points.updateCurrentPoint(null, relativeMouseState.x, relativeMouseState.y)

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

function process(pointerState: MouseState) {
  const gl = Application.gl

  gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)

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
    const currentLayerID = useLayerStore.getState().currentLayer
    const currentLayer = ResourceManager.get(`Layer${currentLayerID}`)

    DrawingManager.commitLayer(scratchLayer, currentLayer, currentLayer)
  }
  DrawingManager.clearSpecific(scratchLayer)

  DrawingManager.fullyRecomposite()
  DrawingManager.pauseDrawNextFrame()

  DrawingManager.waitUntilInteractionEnd = false

  Application.currentOperation.reset()
  scratchLayerBoundingBox.reset()

  currentTool.reset()
}

export const InteractionManager = {
  currentMousePosition,
  endInteraction,
  process,
  executeOperation,
}
