import { MutableRefObject } from "react"

import { usePreferenceStore } from "@/stores/PreferenceStore"
import { tools } from "@/stores/ToolStore.ts"

import { tool_types } from "@/constants.tsx"

import { getRelativeMousePosition, getDistance, performanceSafeguard, toClipSpace, lerp } from "@/utils.ts"

import {
  ILayer,
  UIInteraction,
  MouseState,
  IOperation,
  AvailableTools,
  IBrush,
  IEraser,
  IEyedropper,
  IFill,
  RenderInfo,
} from "@/types.ts"
import { Operation } from "@/objects/Operation.ts"

import { ExponentialSmoothingFilter } from "@/objects/ExponentialSmoothingFilter"

import { mat3, vec2 } from "gl-matrix"

import { Camera } from "@/objects/Camera"
import { ResourceManager } from "@/managers/resourceManager"
import { createCanvasRenderTexture } from "@/resources/canvasRenderTexture"

import renderTextureFragment from "@/shaders/TexToScreen/texToScreen.frag?raw"
import renderTextureVertex from "@/shaders/TexToScreen/texToScreen.vert?raw"
import { createTransparencyGrid } from "@/resources/transparencyGrid"
import { createBackground } from "@/resources/background"

const checkfps = performanceSafeguard()

const pressureFilter = new ExponentialSmoothingFilter(0.6)
const positionFilter = new ExponentialSmoothingFilter(0.5)

let startMoving = false
const startCamPosition = { x: 0, y: 0 }
const startPos = { x: 0, y: 0 }
const startInvViewProjMat: mat3 = mat3.create()
const tempPos = vec2.create()
let zoomTarget = 0

enum pixelQuality {
  nearest,
  trilinear,
}

class _DrawingManager {
  gl: WebGL2RenderingContext
  currentLayer: ILayer
  currentTool: AvailableTools
  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  canvasRef: MutableRefObject<HTMLCanvasElement>
  pixelQuality: pixelQuality
  initialized: boolean

  glInfo: {
    supportedType: number
    supportedImageFormat: number
    supportedMagFilterType: number
    supportedMinFilterType: number
  }

  state: {
    renderInfo: RenderInfo
  }

  constructor() {
    this.gl = {} as WebGL2RenderingContext
    this.currentLayer = {} as ILayer
    this.currentTool = {} as AvailableTools
    this.currentOperation = {} as Operation
    this.waitUntilInteractionEnd = false
    this.needRedraw = false

    this.glInfo = {} as unknown as typeof this.glInfo
  }

  // TODO: This framework may not be generic enough to describe many non-drawing tools
  private execute = (operation: IOperation) => {
    if (!operation.readyToDraw) return

    const useIfPossible = (tool: AvailableTools): tool is IEyedropper & IFill => {
      return "use" in tool
    }

    const drawIfPossible = (tool: AvailableTools): tool is IBrush & IEraser => {
      return "draw" in tool
    }

    if (useIfPossible(operation.tool)) operation.tool.use(this.gl, operation)
    if (drawIfPossible(operation.tool)) operation.tool.draw(this.gl, operation)

    // const format = this.gl.getParameter(this.gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
    // const type = this.gl.getParameter(this.gl.IMPLEMENTATION_COLOR_READ_TYPE) as number
    // const data = new Float32Array(4)
    // this.gl.readPixels(0, 0, 1, 1, format, type, data)
    // console.log(data)
  }

  private use = (relativeMouseState: MouseState) => {
    if (this.waitUntilInteractionEnd) return

    const operation = this.currentOperation

    const prefs = usePreferenceStore.getState().prefs

    if (pressureFilter.smoothAmount !== prefs.pressureFiltering) pressureFilter.smoothAmount = prefs.pressureFiltering
    if (positionFilter.smoothAmount !== prefs.mouseFiltering) positionFilter.smoothAmount = prefs.mouseFiltering

    if (!operation.tool || Object.keys(operation.tool).length === 0) {
      operation.tool = this.currentTool
      operation.readyToDraw = true
    }

    let spacing =
      "size" in operation.tool.settings && "spacing" in operation.tool.settings
        ? operation.tool.settings.size * (operation.tool.settings.spacing / 100)
        : 0

    if (relativeMouseState.pointerType === "pen") {
      const pressureSensitivity = prefs.pressureSensitivity * 10

      if (relativeMouseState.pressure < 0.01) return

      spacing =
        spacing - (spacing * pressureSensitivity * (1 - relativeMouseState.pressure)) / (1 + pressureSensitivity)
    }

    const prevPoint = operation.points.getPoint(-1).active
      ? operation.points.getPoint(-1)
      : operation.points.currentPoint

    switch (operation.tool.type) {
      case tool_types.STROKE:
        if (!prevPoint.active || (prevPoint.active && getDistance(prevPoint, relativeMouseState) >= spacing)) {
          const filteredPositions = positionFilter.filter([relativeMouseState.x, relativeMouseState.y])

          operation.points.currentPoint.x = filteredPositions[0]
          operation.points.currentPoint.y = filteredPositions[1]
          operation.points.currentPoint.pressure = relativeMouseState.pressure
          operation.points.currentPoint.pointerType = relativeMouseState.pointerType

          vec2.lerp(
            operation.points.currentPoint.location,
            prevPoint.location,
            operation.points.currentPoint.location,
            prefs.mouseSmoothing,
          )

          const filteredPressure = pressureFilter.filter([operation.points.currentPoint.pressure])
          operation.points.currentPoint.pressure = filteredPressure[0]

          operation.points.currentPoint.active = true

          operation.points.nextPoint()

          operation.readyToDraw = true
        }
        break

      case tool_types.POINT:
        this.waitUntilInteractionEnd = true

        operation.points.updateCurrentPoint({}, relativeMouseState.x, relativeMouseState.y)

        operation.points.currentPoint.active = true

        operation.points.nextPoint()

        operation.readyToDraw = true
        break
    }
  }

  private executeCurrentOperation = () => {
    if (!this.currentOperation.readyToDraw) return

    const gl = this.gl

    gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("CanvasRenderTexture").bufferInfo.texture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, ResourceManager.get("CanvasRenderTexture").bufferInfo.framebuffer)

    const switchIfPossible = (tool: AvailableTools): tool is IBrush & IEraser => {
      return "switchTo" in tool
    }

    if (switchIfPossible(this.currentOperation.tool)) this.currentOperation.tool.switchTo(gl)

    this.execute(this.currentOperation)

    // Unbind
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private loop = (currentUIInteraction: React.MutableRefObject<UIInteraction>, time: number) => {
    const prefs = usePreferenceStore.getState().prefs

    const gl = this.gl

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    // resizeCanvasToDisplaySize(this.canvasRef.current, () => (this.needRedraw = true))

    // if (this.currentLayer.noDraw) return

    // if (this.needRedraw) {
    //   this.needRedraw = false

    //   if (this.currentLayer.undoSnapshotQueue.length > 0) {
    //     this.gl.putImageData(this.currentLayer.undoSnapshotQueue.at(-1), 0, 0)
    //   } else {
    //     if (this.currentLayer.drawingData) {
    //       this.gl.putImageData(this.currentLayer.drawingData, 0, 0)
    //     }
    //   }
    // }

    // Swap to Nearest Neighbor mipmap interpolation when zoomed very closely
    if (Camera.zoom > 3.5) {
      if (this.pixelQuality !== pixelQuality.nearest) {
        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("CanvasRenderTexture").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)

        gl.bindTexture(gl.TEXTURE_2D, null)

        this.pixelQuality = pixelQuality.nearest
      }
    } else {
      if (this.pixelQuality !== pixelQuality.trilinear) {
        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("CanvasRenderTexture").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.glInfo.supportedMagFilterType)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.glInfo.supportedMinFilterType)

        gl.bindTexture(gl.TEXTURE_2D, null)

        this.pixelQuality = pixelQuality.trilinear
      }
    }

    if (currentUIInteraction.current.modifierState.has("space")) {
      if ((DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor !== "grab") {
        ;(DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor = "grab"
      }
    } else {
      if ((DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor == "grab") {
        ;(DrawingManager.gl.canvas as HTMLCanvasElement).style.cursor = "crosshair"
      }
    }

    const relativeMouseState = getRelativeMousePosition(
      gl.canvas as HTMLCanvasElement,
      currentUIInteraction.current.mouseState,
    )

    const clipSpaceMousePosition = toClipSpace(relativeMouseState, this.gl.canvas as HTMLCanvasElement)

    if (currentUIInteraction.current.wheelState.wheel) {
      zoomTarget = Camera.zoom * Math.pow(2, currentUIInteraction.current.wheelState.wheel * -0.002)
      currentUIInteraction.current.wheelState.wheel = 0
    }
    if (zoomTarget) {
      const mousePositionBeforeZoom = Camera.getWorldMousePosition(relativeMouseState, gl)

      const zoomLerpAmount = 0.1

      Camera.zoom = Math.max(0.1, Math.min(4, lerp(Camera.zoom, zoomTarget, zoomLerpAmount)))

      const mousePositionAfterZoom = Camera.getWorldMousePosition(relativeMouseState, gl)

      const zoomXOffset = mousePositionBeforeZoom[0] - mousePositionAfterZoom[0]

      const zoomYOffset = mousePositionBeforeZoom[1] - mousePositionAfterZoom[1]

      // Zoom Repositioning
      Camera.x += zoomXOffset
      Camera.y += zoomYOffset

      if (Math.abs(Camera.zoom - zoomTarget) < 0.001) {
        zoomTarget = 0
      }
    }

    Camera.updateViewProjectionMatrix(gl)

    if (
      currentUIInteraction.current.modifierState.has("space") &&
      relativeMouseState.leftMouseDown &&
      relativeMouseState.inbounds
    ) {
      if (startMoving) {
        vec2.transformMat3(tempPos, clipSpaceMousePosition, startInvViewProjMat)

        const panLerpAmount = 0.6
        Camera.x = lerp(Camera.x, startCamPosition.x + (startPos.x - tempPos[0]), panLerpAmount)
        Camera.y = lerp(Camera.y, startCamPosition.y + (startPos.y - tempPos[1]), panLerpAmount)
      } else {
        startMoving = true

        mat3.copy(startInvViewProjMat, Camera.getInverseViewProjectionMatrix())

        vec2.transformMat3(tempPos, clipSpaceMousePosition, startInvViewProjMat)

        startCamPosition.x = Camera.x
        startCamPosition.y = Camera.y

        startPos.x = tempPos[0]
        startPos.y = tempPos[1]
      }
    } else if (relativeMouseState.leftMouseDown && relativeMouseState.inbounds) {
      const worldPosition = Camera.getWorldMousePosition(relativeMouseState, gl)

      relativeMouseState.x = worldPosition[0]
      relativeMouseState.y = worldPosition[1]

      this.use(relativeMouseState)
    } else {
      if (this.currentOperation.readyToDraw) {
        this.endInteraction()
      }

      if (startMoving) {
        startMoving = false

        startCamPosition.x = 0
        startCamPosition.y = 0
        startPos.x = 0
        startPos.y = 0
        mat3.identity(startInvViewProjMat)
      }
    }

    // debugPoints(
    //   this.gl,
    //   ResourceManager.get("CanvasRenderTexture").bufferInfo,
    //   this.currentOperation.points,
    //   "1., 0., 1., 1.",
    // )

    // Draw Canvas
    gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    this.executeCurrentOperation()

    // Draw Screen
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)

    this.renderToScreen(ResourceManager.get("Background"), false)

    const transparencyGrid = ResourceManager.get("TransparencyGrid")

    this.renderToScreen(transparencyGrid, false, () => {
      gl.uniformMatrix3fv(
        transparencyGrid.programInfo.uniforms.u_matrix,
        false,
        Camera.project(transparencyGrid.data!.matrix!),
      )
    })

    const canvasRenderTexture = ResourceManager.get("CanvasRenderTexture")

    this.renderToScreen(canvasRenderTexture, true, () => {
      gl.uniformMatrix3fv(
        canvasRenderTexture.programInfo.uniforms.u_matrix,
        false,
        Camera.project(canvasRenderTexture.data!.matrix!),
      )
    })

    checkfps(time, this.endInteraction)

    requestAnimationFrame((time) => this.loop(currentUIInteraction, time))
  }

  /**
   * Start the render loop
   */
  public start = (currentUIInteraction: React.MutableRefObject<UIInteraction>) => {
    requestAnimationFrame((time) => this.loop(currentUIInteraction, time))
  }

  public swapTool = (tool: AvailableTools) => {
    this.currentTool = tool
    this.currentOperation.reset()
    this.currentOperation.swapTool(tool)
  }

  /**
   * Resets everything releated to the current operation
   *
   * Should be called whenever the user completes something (finishes drawing a stroke in some way, clicks the canvas, etc)
   *
   * @param save this determines whether to add the completed interation to the undo history (defaults to true)
   */
  public endInteraction = (save = true) => {
    if (this.currentLayer.noDraw) return

    // // TODO: Debug mode menu option so these don't need to be commented on and off
    // debugPoints(
    //   this.gl,
    //   ResourceManager.get("CanvasRenderTexture").bufferInfo,
    //   this.currentOperation.points,
    //   "1., 0., 1., 1.",
    // )

    this.waitUntilInteractionEnd = false
    this.needRedraw = true
    positionFilter.reset()
    pressureFilter.reset()
    this.currentOperation.reset()

    if (save) {
      // this.currentLayer.addCurrentToUndoSnapshotQueue(this.gl)
    }
  }

  /**
   * Set up everything we need
   *
   * This should be called before starting the render loop
   */
  public init = () => {
    if (this.initialized) return

    const prefs = usePreferenceStore.getState().prefs
    const gl = this.gl

    gl.depthFunc(gl.LEQUAL)
    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)

    // WebGL2 Float textures are supported by default
    const floatBufferExt = gl.getExtension("EXT_color_buffer_float")

    // Firefox will give an implicit enable warning if EXT_float_blend is enabled before
    // EXT_color_buffer_float because the implicit EXT_color_buffer_float overrides it.
    // this is not supported on iOS
    gl.getExtension("EXT_float_blend")
    gl.getExtension("OES_texture_float") // Only needed for 32bit?
    const floatTextureLinearExt = gl.getExtension("OES_texture_float_linear")
    const halfFloatTextureExt = gl.getExtension("OES_texture_half_float")
    const halfFloatTextureLinearExt = gl.getExtension("OES_texture_half_float_linear")
    const halfFloatColorBufferExt = gl.getExtension("EXT_color_buffer_half_float")

    // TODO: 8bit fallback shouldn't be too hard now
    if (!floatBufferExt && (!halfFloatTextureExt || !halfFloatColorBufferExt))
      throw new Error("This device does not support float buffers")

    // halfFloatTextureExt && halfFloatColorBufferExt seem to be null on iPadOS 17+
    // Not sure what devices will need these then

    // this.glInfo.supportedType = floatBufferExt
    //   ? gl.FLOAT
    //   : halfFloatTextureExt && halfFloatColorBufferExt
    //     ? gl.HALF_FLOAT
    //     : gl.UNSIGNED_BYTE

    // this.glInfo.supportedImageFormat = floatBufferExt
    //   ? gl.RGBA32F
    //   : halfFloatTextureExt && halfFloatColorBufferExt
    //     ? gl.RGBA16F
    //     : gl.RGBA

    this.glInfo.supportedType = gl.FLOAT
    this.glInfo.supportedImageFormat = gl.RGBA16F

    this.glInfo.supportedMinFilterType =
      floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST
    this.glInfo.supportedMagFilterType = floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR : gl.NEAREST

    gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST)

    ResourceManager.create(
      "CanvasRenderTexture",
      createCanvasRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight, renderTextureFragment, renderTextureVertex),
    )

    ResourceManager.create("TransparencyGrid", createTransparencyGrid(gl, prefs.canvasWidth, prefs.canvasHeight))

    ResourceManager.create("Background", createBackground(gl))

    Camera.init(gl)

    // Initial Canvas Zoom and Positioning

    // Minimum space between canvas edges and screen edges
    // Should be greater than the UI width (TODO: Automate)
    const margin = 50

    // Start with a zoom that allows the whole canvas to in view
    const widthZoomTarget = gl.canvas.width - margin * 2
    const heightZoomTarget = gl.canvas.height - margin * 2
    Camera.zoom = Math.min(widthZoomTarget / prefs.canvasWidth, heightZoomTarget / prefs.canvasHeight)

    // Start with a camera position that centers the canvas in view
    Camera.x = -Math.max(margin, widthZoomTarget / 2 - (prefs.canvasWidth * Camera.zoom) / 2)
    Camera.y = -Math.max(margin, heightZoomTarget / 2 - (prefs.canvasHeight * Camera.zoom) / 2)

    // Initialize tools
    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })

    this.currentOperation = new Operation(this.currentTool)

    this.initialized = true
  }

  /**
   * Draw render texture to the canvas draw buffer
   */
  public renderToScreen = (renderInfo: RenderInfo, mipmap: boolean, setUniforms?: () => void) => {
    const gl = this.gl

    if (renderInfo.programInfo.program) gl.useProgram(renderInfo.programInfo.program)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    if (renderInfo.bufferInfo.texture) gl.bindTexture(gl.TEXTURE_2D, renderInfo.bufferInfo.texture)

    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D)

    if (renderInfo.programInfo.VBO) gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo.VBO)
    if (renderInfo.programInfo.VAO) gl.bindVertexArray(renderInfo.programInfo.VAO)

    if (setUniforms) setUniforms()

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindVertexArray(null)
  }

  /** Fill black on whatever the current WebGL state is */
  public clear = () => {
    const gl = this.gl

    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 1]))
  }

  // TODO: Reimplement undo
  public undo = () => {
    //   if (this.currentLayer.undoSnapshotQueue.length > 0 && this.currentOperation.points.length === 0) {
    //     this.currentLayer.redoSnapshotQueue.push(this.currentLayer.undoSnapshotQueue.pop())
    //   }
    //   this.endInteraction(false)
  }
}

export const DrawingManager = new _DrawingManager()
