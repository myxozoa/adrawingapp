import { usePreferenceStore } from "@/stores/PreferenceStore"
import { tools } from "@/stores/ToolStore.ts"

import { tool_types } from "@/constants.tsx"

import { getDistance, throttleRAF, calculateFromPressure } from "@/utils.ts"

import {
  ILayer,
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

import { vec2 } from "gl-matrix"

import { Camera } from "@/objects/Camera"
import { ResourceManager } from "@/managers/ResourceManager"
import { createCanvasRenderTexture } from "@/resources/canvasRenderTexture"

import renderTextureFragment from "@/shaders/TexToScreen/texToScreen.frag?raw"
import renderTextureVertex from "@/shaders/TexToScreen/texToScreen.vert?raw"
import { createTransparencyGrid } from "@/resources/transparencyGrid"
import { createBackground } from "@/resources/background"
import { Application } from "@/managers/ApplicationManager"

const switchIfPossible = (tool: AvailableTools): tool is IBrush & IEraser => {
  return "switchTo" in tool
}

const useIfPossible = (tool: AvailableTools): tool is IEyedropper & IFill => {
  return "use" in tool
}

const drawIfPossible = (tool: AvailableTools): tool is IBrush & IEraser => {
  return "draw" in tool
}

export function renderUniforms(gl: WebGL2RenderingContext, reference: RenderInfo) {
  gl.uniformMatrix3fv(reference.programInfo.uniforms.u_matrix, false, Camera.project(reference.data!.matrix!))
}

const startThrottle = throttleRAF()
const renderThrottle = throttleRAF()

const pressureFilter = new ExponentialSmoothingFilter(0.6)
const positionFilter = new ExponentialSmoothingFilter(0.5)

enum pixelQuality {
  nearest,
  trilinear,
}

const previousEvent = { x: 0, y: 0 }

class _DrawingManager {
  gl: WebGL2RenderingContext
  currentLayer: ILayer
  currentTool: AvailableTools
  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  pixelQuality: pixelQuality
  initialized: boolean
  drawing: boolean

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

    this.drawing = false
  }

  // TODO: This framework may not be generic enough to describe many non-drawing tools
  private execute = (operation: IOperation) => {
    if (!operation.readyToDraw) return

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

    if (switchIfPossible(this.currentOperation.tool)) this.currentOperation.tool.switchTo(gl)

    this.execute(this.currentOperation)

    // Unbind
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private loop = (pointerState: MouseState) => {
    const gl = this.gl
    const prefs = usePreferenceStore.getState().prefs

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.scissor(0, 0, gl.canvas.width, gl.canvas.height)

    if (pointerState.leftMouseDown) {
      this.use(pointerState)

      // Draw to Canvas
      gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)
      gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

      this.executeCurrentOperation()
    }
  }

  public swapPixelInterpolation = () => {
    const gl = this.gl

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
  }

  public render = () => {
    const gl = this.gl

    // Draw Screen
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.scissor(0, 0, gl.canvas.width, gl.canvas.height)

    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)

    this.renderToScreen(ResourceManager.get("Background"), false)

    const transparencyGrid = ResourceManager.get("TransparencyGrid")

    this.renderToScreen(transparencyGrid, false, renderUniforms)

    const canvasRenderTexture = ResourceManager.get("CanvasRenderTexture")

    this.renderToScreen(canvasRenderTexture, true, renderUniforms)
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
    // if (this.currentLayer.noDraw) return

    this.waitUntilInteractionEnd = false
    this.needRedraw = true
    positionFilter.reset()
    pressureFilter.reset()
    this.currentOperation.reset()

    this.currentTool.reset()

    if (save) {
      // this.currentLayer.addCurrentToUndoSnapshotQueue(this.gl)
    }
  }

  public resetCam = () => {
    const prefs = usePreferenceStore.getState().prefs

    const gl = this.gl
    // Initial Canvas Zoom and Positioning

    // Minimum space between canvas edges and screen edges
    // Should be greater than the UI width (TODO: Automate)
    const margin = 50

    // Start with a zoom that allows the whole canvas to be in view
    const widthZoomTarget = gl.canvas.width - margin * 2
    const heightZoomTarget = gl.canvas.height - margin * 2
    Camera.zoom = Math.min(widthZoomTarget / prefs.canvasWidth, heightZoomTarget / prefs.canvasHeight)

    // Start with a camera position that centers the canvas in view
    Camera.x = -Math.max(margin, widthZoomTarget / 2 - (prefs.canvasWidth * Camera.zoom) / 2)
    Camera.y = -Math.max(margin, heightZoomTarget / 2 - (prefs.canvasHeight * Camera.zoom) / 2)

    Camera.updateViewProjectionMatrix(gl)

    this.swapPixelInterpolation()
  }

  private getExtensions(gl: WebGL2RenderingContext) {
    // WebGL2 Float textures are supported by default
    const floatBufferExt = gl.getExtension("EXT_color_buffer_float")

    // Firefox will give an implicit enable warning if EXT_float_blend is enabled before
    // EXT_color_buffer_float because the implicit EXT_color_buffer_float overrides it.
    // this is not supported on iOS
    gl.getExtension("EXT_float_blend")
    gl.getExtension("OES_texture_float") // Only needed for 32bit?
    /*const floatTextureLinearExt = */ gl.getExtension("OES_texture_float_linear")
    const halfFloatTextureExt = gl.getExtension("OES_texture_half_float")
    /* const halfFloatTextureLinearExt = */ gl.getExtension("OES_texture_half_float_linear")
    const halfFloatColorBufferExt = gl.getExtension("EXT_color_buffer_half_float")

    if (!floatBufferExt && (!halfFloatTextureExt || !halfFloatColorBufferExt))
      throw new Error("This device does not support float buffers")
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
    gl.enable(gl.SCISSOR_TEST)
    gl.disable(gl.DEPTH_TEST)
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.disable(gl.DITHER)
    gl.disable(gl.STENCIL_TEST)
    gl.disable(gl.POLYGON_OFFSET_FILL)
    gl.depthMask(false)

    this.getExtensions(gl)

    // halfFloatTextureExt && halfFloatColorBufferExt seem to be null on iPadOS 17+
    // Not sure what devices will need these then

    this.glInfo.supportedType = gl.FLOAT
    this.glInfo.supportedImageFormat = gl.RGBA16F

    // Feature detecting  float texture linear filtering on iOS / iPadOS seems to not work at all
    // TODO: Figure out what to do
    this.glInfo.supportedMinFilterType = gl.LINEAR_MIPMAP_LINEAR
    this.glInfo.supportedMagFilterType = gl.LINEAR
    // this.glInfo.supportedMinFilterType =
    //   floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST
    // this.glInfo.supportedMagFilterType = floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR : gl.NEAREST

    gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST)

    ResourceManager.create(
      "CanvasRenderTexture",
      createCanvasRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight, renderTextureFragment, renderTextureVertex),
    )

    ResourceManager.create("TransparencyGrid", createTransparencyGrid(gl, prefs.canvasWidth, prefs.canvasHeight))

    ResourceManager.create("Background", createBackground(gl))

    Camera.init(gl)

    this.resetCam()

    // Initialize tools
    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })

    this.currentOperation = new Operation(this.currentTool)

    this.initialized = true

    Application.resize()
  }

  public beginDraw = (pointerState: MouseState) => {
    this.drawing = true

    this.loop(pointerState)

    renderThrottle(this.render)
  }

  public continueDraw = (pointerState: MouseState) => {
    if (this.drawing) {
      this.loop(pointerState)

      renderThrottle(this.render)
    }
  }

  public start = () => {
    startThrottle(this.render)
  }

  /**
   * Draw render texture to the canvas draw buffer
   */
  public renderToScreen = (
    renderInfo: RenderInfo,
    mipmap: boolean,
    setUniforms?: (gl: WebGL2RenderingContext, reference: RenderInfo) => void,
  ) => {
    const gl = this.gl

    if (renderInfo.programInfo.program) gl.useProgram(renderInfo.programInfo.program)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    if (renderInfo.bufferInfo.texture) gl.bindTexture(gl.TEXTURE_2D, renderInfo.bufferInfo.texture)

    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D)

    if (renderInfo.programInfo.VBO) gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo.VBO)
    if (renderInfo.programInfo.VAO) gl.bindVertexArray(renderInfo.programInfo.VAO)

    if (setUniforms) setUniforms(gl, renderInfo)

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
