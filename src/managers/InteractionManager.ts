import { MouseState, IOperation, AvailableTools, IBrush, IEraser, IEyedropper, IFill } from "@/types.ts"
import { tool_types } from "@/constants.tsx"
import { getDistance, calculateFromPressure, CanvasSizeCache } from "@/utils.ts"
import { Application } from "@/managers/ApplicationManager"
import { usePreferenceStore } from "@/stores/PreferenceStore"
import { ResourceManager } from "@/managers/ResourceManager"
import { vec2 } from "gl-matrix"
import { ExponentialSmoothingFilter } from "@/objects/ExponentialSmoothingFilter"
import { DrawingManager } from "@/managers/DrawingManager"

const switchIfPossible = (tool: AvailableTools): tool is IBrush & IEraser => {
  return "switchTo" in tool
}

const useIfPossible = (tool: AvailableTools): tool is IEyedropper & IFill => {
  return "use" in tool
}

const drawIfPossible = (tool: AvailableTools): tool is IBrush & IEraser => {
  return "draw" in tool
}

const pressureFilter = new ExponentialSmoothingFilter(0.6)
const positionFilter = new ExponentialSmoothingFilter(0.5)
const previousEvent = { x: 0, y: 0 }

class _InteractionManager {
  private prepareOperation = (relativeMouseState: MouseState) => {
    if (DrawingManager.waitUntilInteractionEnd) return

    const operation = Application.currentOperation

    const prefs = usePreferenceStore.getState().prefs

    if (pressureFilter.smoothAmount !== prefs.pressureFiltering) pressureFilter.smoothAmount = prefs.pressureFiltering
    if (positionFilter.smoothAmount !== prefs.mouseFiltering) positionFilter.smoothAmount = prefs.mouseFiltering

    const prevPoint = operation.points.getPoint(-1).active
      ? operation.points.getPoint(-1)
      : operation.points.currentPoint

    const _size = "size" in operation.tool.settings ? operation.tool.settings.size : 0

    const spacing = "spacing" in operation.tool.settings ? operation.tool.settings.spacing / 100 : 0

    const size = calculateFromPressure(_size, relativeMouseState.pressure, relativeMouseState.pointerType === "pen")

    const stampSpacing = Math.max(0.5, size * 2 * spacing)

    const filteredPositions = positionFilter.filter(relativeMouseState.x, relativeMouseState.y)

    operation.points.currentPoint.x = filteredPositions[0]
    operation.points.currentPoint.y = filteredPositions[1]
    operation.points.currentPoint.pointerType = relativeMouseState.pointerType

    const filteredPressure = pressureFilter.filter(relativeMouseState.pressure)
    operation.points.currentPoint.pressure = filteredPressure[0]

    vec2.lerp(
      operation.points.currentPoint.location,
      prevPoint.location,
      operation.points.currentPoint.location,
      prefs.mouseSmoothing,
    )

    const dist = getDistance(prevPoint, operation.points.currentPoint)

    switch (operation.tool.type) {
      case tool_types.STROKE:
        if (!prevPoint.active || (prevPoint.active && dist >= stampSpacing / 3)) {
          operation.points.currentPoint.active = true

          operation.points.nextPoint()

          operation.readyToDraw = true

          previousEvent.x = relativeMouseState.x
          previousEvent.y = relativeMouseState.y
        }
        break

      case tool_types.POINT:
        DrawingManager.waitUntilInteractionEnd = true

        operation.points.updateCurrentPoint({}, relativeMouseState.x, relativeMouseState.y)

        operation.points.currentPoint.active = true

        operation.points.nextPoint()

        operation.readyToDraw = true
        break
    }
  }

  private executeOperation = (operation: IOperation) => {
    if (!operation.readyToDraw) return

    const gl = Application.gl

    // TODO: More elegant solution here
    if (operation.tool.name === "ERASER" || operation.tool.name === "EYEDROPPER") {
      gl.bindFramebuffer(gl.FRAMEBUFFER, ResourceManager.get("DisplayLayer").bufferInfo?.framebuffer)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, ResourceManager.get("ScratchLayer").bufferInfo?.framebuffer)
    }

    if (switchIfPossible(operation.tool)) operation.tool.switchTo(gl)

    if (useIfPossible(operation.tool)) operation.tool.use(gl, operation)
    if (drawIfPossible(operation.tool)) operation.tool.draw(gl, operation)

    // const format = this.gl.getParameter(this.gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
    // const type = this.gl.getParameter(this.gl.IMPLEMENTATION_COLOR_READ_TYPE) as number
    // const data = new Float32Array(4)
    // this.gl.readPixels(0, 0, 1, 1, format, type, data)
    // console.log(data)

    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  public process = (pointerState: MouseState) => {
    const gl = Application.gl
    const prefs = usePreferenceStore.getState().prefs

    gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)

    this.prepareOperation(pointerState)

    gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    this.executeOperation(Application.currentOperation)
  }

  /**
   * Resets everything releated to the current operation
   *
   * Should be called whenever the user completes something (finishes drawing a stroke in some way, clicks the canvas, etc)
   *
   * @param save this determines whether to add the completed interation to the undo history (defaults to true)
   */
  public endInteraction = (save = true) => {
    // if (this.currentLayer.noDraw) return

    const scratchLayer = ResourceManager.get("ScratchLayer")
    const intermediaryLayer = ResourceManager.get("IntermediaryLayer")

    // TODO: More elegant solution here
    if (
      save &&
      Application.currentOperation.tool.name !== "ERASER" &&
      Application.currentOperation.tool.name !== "EYEDROPPER"
    ) {
      DrawingManager.applyScratchLayer()
    }
    DrawingManager.clearSpecific(scratchLayer)
    DrawingManager.clearSpecific(intermediaryLayer)

    DrawingManager.render()

    DrawingManager.waitUntilInteractionEnd = false
    DrawingManager.needRedraw = true
    positionFilter.reset()
    pressureFilter.reset()
    Application.currentOperation.reset()

    Application.currentTool.reset()
  }
}

export const InteractionManager = new _InteractionManager()
