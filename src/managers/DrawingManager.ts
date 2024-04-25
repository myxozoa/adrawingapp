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

import { mat3, vec2 } from "gl-matrix"

import { Camera } from "@/objects/Camera"
import { ResourceManager } from "@/managers/ResourceManager"
import { createCanvasRenderTexture } from "@/resources/canvasRenderTexture"

import renderTextureFragment from "@/shaders/TexToScreen/texToScreen.frag?raw"
import renderTextureVertex from "@/shaders/TexToScreen/texToScreen.vert?raw"
import scratchFragment from "@/shaders/Scratch/scratch.frag?raw"
import scratchVertex from "@/shaders/Scratch/scratch.vert?raw"

import { createTransparencyGrid } from "@/resources/transparencyGrid"
import { createFullscreenQuad } from "@/resources/fullscreenQuad"
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

export function gridRenderUniforms(gl: WebGL2RenderingContext, reference: RenderInfo) {
  const prefs = usePreferenceStore.getState().prefs
  const size = prefs.canvasWidth * 0.01

  gl.uniform1f(reference.programInfo.uniforms.u_size, size)
  renderUniforms(gl, reference)
}

const startThrottle = throttleRAF()
const renderThrottle = throttleRAF()

const pressureFilter = new ExponentialSmoothingFilter(0.6)
const positionFilter = new ExponentialSmoothingFilter(0.5)

enum pixelInterpolation {
  nearest,
  trilinear,
}

const previousEvent = { x: 0, y: 0 }

const transparent = new Float32Array([0, 0, 0, 0])

class _DrawingManager {
  gl: WebGL2RenderingContext
  currentLayer: ILayer
  currentTool: AvailableTools
  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  pixelInterpolation: pixelInterpolation
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

    // TODO: More elegant solution here
    if (this.currentOperation.tool.name === "ERASER" || this.currentOperation.tool.name === "EYEDROPPER") {
      gl.bindFramebuffer(gl.FRAMEBUFFER, ResourceManager.get("DisplayLayer").bufferInfo.framebuffer)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, ResourceManager.get("ScratchLayer").bufferInfo.framebuffer)
    }

    if (switchIfPossible(this.currentOperation.tool)) this.currentOperation.tool.switchTo(gl)

    this.execute(this.currentOperation)

    // Unbind
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
      if (this.pixelInterpolation !== pixelInterpolation.nearest) {
        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("DisplayLayer").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)

        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("ScratchLayer").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)

        gl.bindTexture(gl.TEXTURE_2D, null)

        this.pixelInterpolation = pixelInterpolation.nearest
      }
    } else {
      if (this.pixelInterpolation !== pixelInterpolation.trilinear) {
        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("DisplayLayer").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.glInfo.supportedMagFilterType)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.glInfo.supportedMinFilterType)

        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("ScratchLayer").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.glInfo.supportedMagFilterType)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.glInfo.supportedMinFilterType)

        gl.bindTexture(gl.TEXTURE_2D, null)

        this.pixelInterpolation = pixelInterpolation.trilinear
      }
    }
  }

  public render = () => {
    const prefs = usePreferenceStore.getState().prefs
    const gl = this.gl

    // Draw Screen
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.scissor(0, 0, gl.canvas.width, gl.canvas.height)

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.blendEquation(gl.FUNC_ADD)

    this.renderToScreen(ResourceManager.get("Background"), false)

    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    const transparencyGrid = ResourceManager.get("TransparencyGrid")

    this.renderToScreen(transparencyGrid, false, gridRenderUniforms)

    const displayLayer = ResourceManager.get("DisplayLayer")

    this.renderToScreen(displayLayer, true, renderUniforms)

    const scratchLayerTexture = ResourceManager.get("ScratchLayer")

    this.renderToScreen(scratchLayerTexture, true, renderUniforms)
  }

  public swapTool = (tool: AvailableTools) => {
    this.currentTool = tool
    this.currentOperation.reset()
    this.currentOperation.swapTool(tool)
  }

  public clearSpecific = (renderInfo: RenderInfo, color?: Float32Array) => {
    const prefs = usePreferenceStore.getState().prefs

    const gl = this.gl

    gl.bindFramebuffer(gl.FRAMEBUFFER, renderInfo.bufferInfo.framebuffer)

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    this.clear(color)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
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
    if (save && this.currentOperation.tool.name !== "ERASER" && this.currentOperation.tool.name !== "EYEDROPPER") {
      const displayLayer = ResourceManager.get("DisplayLayer")

      const prefs = usePreferenceStore.getState().prefs

      const gl = this.gl

      gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)
      gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      gl.blendEquation(gl.FUNC_ADD)

      gl.bindFramebuffer(gl.FRAMEBUFFER, intermediaryLayer.bufferInfo?.framebuffer)

      gl.useProgram(intermediaryLayer.programInfo?.program)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, scratchLayer.bufferInfo?.texture)

      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, displayLayer.bufferInfo?.texture)

      gl.bindBuffer(gl.ARRAY_BUFFER, intermediaryLayer.programInfo.VBO)
      gl.bindVertexArray(intermediaryLayer.programInfo.VAO)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      gl.activeTexture(gl.TEXTURE0)

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, intermediaryLayer.bufferInfo?.framebuffer)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, displayLayer.bufferInfo?.framebuffer)

      gl.blitFramebuffer(
        0,
        0,
        prefs.canvasWidth,
        prefs.canvasHeight,
        0,
        0,
        prefs.canvasWidth,
        prefs.canvasHeight,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST,
      )

      gl.useProgram(null)
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.bindTexture(gl.TEXTURE_2D, null)

      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.bindVertexArray(null)
    }
    this.clearSpecific(scratchLayer)
    this.clearSpecific(intermediaryLayer)

    this.render()

    this.waitUntilInteractionEnd = false
    this.needRedraw = true
    positionFilter.reset()
    pressureFilter.reset()
    this.currentOperation.reset()

    this.currentTool.reset()
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
    // TODO: Fix alg
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

    gl.enable(gl.SCISSOR_TEST)
    gl.enable(gl.BLEND)
    gl.enable(gl.DEPTH_TEST)

    gl.disable(gl.CULL_FACE)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.disable(gl.DITHER)
    gl.disable(gl.STENCIL_TEST)
    gl.disable(gl.POLYGON_OFFSET_FILL)
    gl.depthMask(false)

    gl.depthFunc(gl.LESS)
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

    ResourceManager.create("TransparencyGrid", createTransparencyGrid(gl, prefs.canvasWidth, prefs.canvasHeight))

    ResourceManager.create("Background", createFullscreenQuad(gl))

    ResourceManager.create(
      "ScratchLayer",
      createCanvasRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight, renderTextureFragment, renderTextureVertex),
    )

    const scratch = ResourceManager.get("ScratchLayer")
    this.clearSpecific(scratch, new Float32Array([0, 0, 0, 0]))

    ResourceManager.create(
      "DisplayLayer",
      createCanvasRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight, renderTextureFragment, renderTextureVertex),
    )

    ResourceManager.create(
      "IntermediaryLayer",
      createCanvasRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight, scratchFragment, scratchVertex, [
        "u_source_texture",
        "u_destination_texture",
      ]),
    )
    const intermediaryLayer = ResourceManager.get("IntermediaryLayer")
    this.clearSpecific(intermediaryLayer, new Float32Array([0, 0, 0, 0]))

    // Prepare a matrix for -1/1 viewport coordinates so this can be drawn inside a canvas texture
    mat3.scale(
      intermediaryLayer.data?.matrix,
      intermediaryLayer.data?.matrix,
      vec2.fromValues(1 / (prefs.canvasWidth / 2), 1 / (prefs.canvasHeight / 2)),
    )

    mat3.translate(
      intermediaryLayer.data?.matrix,
      intermediaryLayer.data?.matrix,
      vec2.fromValues(-prefs.canvasWidth / 2, -prefs.canvasHeight / 2),
    )

    gl.useProgram(intermediaryLayer.programInfo?.program)

    gl.uniform1i(intermediaryLayer.programInfo?.uniforms.u_source_texture, 0)
    gl.uniform1i(intermediaryLayer.programInfo?.uniforms.u_destination_texture, 1)

    gl.uniformMatrix3fv(intermediaryLayer.programInfo.uniforms.u_matrix, false, intermediaryLayer.data?.matrix)

    gl.useProgram(null)

    Camera.init(gl)

    // Initialize tools
    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })

    this.currentOperation = new Operation(this.currentTool)

    this.initialized = true

    Application.resize()

    this.resetCam()
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
    if (renderInfo.programInfo.VBO) gl.bindBuffer(gl.ARRAY_BUFFER, null)
    if (renderInfo.bufferInfo.texture) gl.bindTexture(gl.TEXTURE_2D, null)
    if (renderInfo.programInfo.VAO) gl.bindVertexArray(null)
  }

  /** Fill clear on whatever the current WebGL state is */
  public clear = (color = transparent) => {
    const gl = this.gl

    gl.clearBufferfv(gl.COLOR, 0, color)
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
