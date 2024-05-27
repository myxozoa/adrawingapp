import type { MouseState, IOperation } from "@/types"
import { tool_types } from "@/constants.tsx"
import { getDistance, calculateFromPressure, CanvasSizeCache, calculateSpacing, lerp } from "@/utils/utils"
import { Application } from "@/managers/ApplicationManager"
import { usePreferenceStore } from "@/stores/PreferenceStore"
import { ResourceManager } from "@/managers/ResourceManager"
import { vec2 } from "gl-matrix"
import { ExponentialSmoothingFilter } from "@/objects/ExponentialSmoothingFilter"
import { DrawingManager, resetScratchBoundingBox } from "@/managers/DrawingManager"
import { useLayerStore } from "@/stores/LayerStore"
import { Camera } from "@/objects/Camera"
import { canDraw, switchIfPossible, canUse } from "@/utils/typeguards"
import { useToolStore } from "@/stores/ToolStore"

const pressureFilter = new ExponentialSmoothingFilter(0.6, 1)
const positionFilter = new ExponentialSmoothingFilter(0.5, 2)

const positionArray = positionFilter.getInputArray()
const pressureArray = pressureFilter.getInputArray()

const currentMousePosition = { x: 0, y: 0 }
let mergeEvent = false
const mergeEventCache = { x: 0, y: 0 }

function prepareOperation(relativeMouseState: MouseState) {
  if (DrawingManager.waitUntilInteractionEnd) return

  const operation = Application.currentOperation

  const prefs = usePreferenceStore.getState().prefs

  if (pressureFilter.smoothAmount !== prefs.pressureFiltering) pressureFilter.changeSetting(prefs.pressureFiltering)
  if (positionFilter.smoothAmount !== prefs.mouseFiltering) positionFilter.changeSetting(prefs.mouseFiltering)

  const prevPoint = operation.points.getPoint(-1).active ? operation.points.getPoint(-1) : operation.points.currentPoint

  const _size = "size" in operation.tool.settings ? operation.tool.settings.size : 0

  const spacing = "spacing" in operation.tool.settings ? operation.tool.settings.spacing : 0

  const size = calculateFromPressure(_size / 2, relativeMouseState.pressure, relativeMouseState.pointerType === "pen")

  const stampSpacing = calculateSpacing(spacing, size)

  // If the new point is too close we don't commit to it and wait until the next one and blend it with the previous
  if (mergeEvent) {
    relativeMouseState.x = lerp(mergeEventCache.x, relativeMouseState.x, 0.5)
    relativeMouseState.y = lerp(mergeEventCache.y, relativeMouseState.y, 0.5)

    mergeEvent = false
  }

  mergeEventCache.x = relativeMouseState.x
  mergeEventCache.y = relativeMouseState.y

  // To counteract the fact that the pointer position resolution gets much lower the
  // more zoomed out the canvas becomes we raise filtering to compensate
  if (Camera.zoom < 1) {
    // These values are just tuned to feel right
    const maxZoomFilteringAdjustment = Math.max(0.7 - (1 - prefs.mouseFiltering), 0)

    const zoomFilteringAdjustment = Math.min((1 - Camera.zoom) * 0.3, maxZoomFilteringAdjustment)

    positionFilter.changeSetting(Math.min(Math.max(prefs.mouseFiltering - zoomFilteringAdjustment, 0.01), 1))
  }

  positionArray[0] = relativeMouseState.x
  positionArray[1] = relativeMouseState.y
  const filteredPositions = positionFilter.filter(positionArray)

  operation.points.currentPoint.x = filteredPositions[0]
  operation.points.currentPoint.y = filteredPositions[1]

  operation.points.currentPoint.pointerType = relativeMouseState.pointerType

  pressureArray[0] = relativeMouseState.pressure
  const filteredPressure = pressureFilter.filter(pressureArray)

  operation.points.currentPoint.pressure = filteredPressure[0]

  // These values are just tuned to feel right
  const maxSmoothAdjustment = Math.max(0.8 - (1 - prefs.mouseSmoothing), 0)

  const pointerPositionLerpAdjustment = Camera.zoom < 1 ? Math.min((1 - Camera.zoom) * 0.7, maxSmoothAdjustment) : 0

  vec2.lerp(
    operation.points.currentPoint.location,
    prevPoint.location,
    operation.points.currentPoint.location,
    Math.min(Math.max(prefs.mouseSmoothing - pointerPositionLerpAdjustment, 0.01), 1),
  )

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
    const currentLayerID = useLayerStore.getState().currentLayer.id
    const currentLayer = ResourceManager.get(`Layer${currentLayerID}`)

    DrawingManager.commitLayer(scratchLayer, currentLayer, currentLayer)
  }
  DrawingManager.clearSpecific(scratchLayer)

  DrawingManager.recomposite()
  DrawingManager.pauseDrawNextFrame()

  DrawingManager.waitUntilInteractionEnd = false
  positionFilter.reset()
  pressureFilter.reset()
  Application.currentOperation.reset()
  resetScratchBoundingBox()

  currentTool.reset()
}

export const InteractionManager = {
  currentMousePosition,
  endInteraction,
  process,
  executeOperation,
}
