import { MutableRefObject } from "react"

import { usePreferenceStore } from "@/stores/PreferenceStore"
import { tools } from "@/stores/ToolStore.ts"

import { tool_types } from "@/constants.tsx"

import {
  getRelativeMousePos,
  getDistance,
  performanceSafeguard,
  toClipSpace,
  // debugPoints,
  // redistributePoints,
} from "@/utils.ts"

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
} from "@/types.ts"
import { Operation } from "@/objects/Operation.ts"

import { ExponentialSmoothingFilter } from "@/objects/ExponentialSmoothingFilter"

import rtFragment from "@/shaders/TexToScreen/texToScreen.frag?raw"
import rtVertex from "@/shaders/TexToScreen/texToScreen.vert?raw"

import * as glUtils from "@/glUtils.ts"
import { mat3, vec2 } from "gl-matrix"

import { TransparencyGrid } from "@/objects/TransparencyGrid"
import { Camera } from "@/objects/Camera"

const checkfps = performanceSafeguard()

const pressureFilter = new ExponentialSmoothingFilter(0.6)
const positionFilter = new ExponentialSmoothingFilter(0.5)

let startMoving = false
const startCamPosition = { x: 0, y: 0 }
const startPos = vec2.create()
const startInvViewProjMat: mat3 = mat3.create()
const tempPos = vec2.create()

class _DrawingManager {
  gl: WebGL2RenderingContext
  currentLayer: ILayer
  currentTool: AvailableTools
  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  canvasRef: MutableRefObject<HTMLCanvasElement>

  glInfo: {
    supportedType: number
    supportedImageFormat: number
    supportedMagFilterType: number
    supportedMinFilterType: number
  }

  renderProgramInfo: {
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation>
    attributes: Record<string, GLint>
    VBO: WebGLBuffer
    VAO: WebGLBuffer
  }

  renderTextureMatrix: mat3

  renderBufferInfo: {
    targetTexture: WebGLTexture
    framebuffer: WebGLFramebuffer
  }

  constructor() {
    this.gl = {} as WebGL2RenderingContext
    this.currentLayer = {} as ILayer
    this.currentTool = {} as AvailableTools
    this.currentOperation = {} as Operation
    this.waitUntilInteractionEnd = false
    this.needRedraw = false

    this.glInfo = {} as unknown as typeof this.glInfo
    this.renderBufferInfo = {} as unknown as typeof this.renderBufferInfo
    this.renderProgramInfo = {} as unknown as typeof this.renderProgramInfo

    this.renderTextureMatrix = mat3.create()
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
  }

  private use = (relativeMouseState: MouseState) => {
    const operation = this.currentOperation

    const prefs = usePreferenceStore.getState().prefs

    if (pressureFilter.smoothAmount !== prefs.pressureFiltering) pressureFilter.smoothAmount = prefs.pressureFiltering
    if (positionFilter.smoothAmount !== prefs.mouseFiltering) positionFilter.smoothAmount = prefs.mouseFiltering

    if (!operation.tool || Object.keys(operation.tool).length === 0) {
      operation.tool = this.currentTool
      operation.readyToDraw = true
    }

    if (this.waitUntilInteractionEnd) return

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

  /**
   * @throws If unable to create texture or lacks support for some extensions
   */
  private createRenderTexture = (gl: WebGL2RenderingContext, width: number, height: number) => {
    const texture = gl.createTexture()

    if (!texture) {
      throw new Error("Error creating render texture")
    }

    gl.bindTexture(gl.TEXTURE_2D, texture)

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      this.glInfo.supportedImageFormat,
      width,
      height,
      0,
      gl.RGBA,
      this.glInfo.supportedType,
      new Float32Array(width * height * 4).fill(1),
    )
    gl.generateMipmap(gl.TEXTURE_2D)

    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.glInfo.supportedMinFilterType)
    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.glInfo.supportedMagFilterType)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Unbind
    gl.bindTexture(gl.TEXTURE_2D, null)

    return texture
  }

  private setupRenderTextureProgramAttributesUniforms = (gl: WebGL2RenderingContext) => {
    const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, rtFragment)
    const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, rtVertex)

    const program = glUtils.createProgram(gl, vertexShader, fragmentShader)

    const attributeNames = ["a_position", "a_tex_coord"]

    const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)

    const uniformNames = ["u_matrix"]

    const uniforms = glUtils.getUniformLocations(gl, program, uniformNames)

    return { attributes, program, uniforms }
  }

  /**
   * @throws If unable to create vertex buffer
   */
  private setupRenderTextureVBO = (gl: WebGL2RenderingContext) => {
    const prefs = usePreferenceStore.getState().prefs

    const buffer = gl.createBuffer()

    if (!buffer) throw new Error("Unable to create WebGL vertex buffer")

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    const positions = [
      // Triangle 1
      0.0,
      0.0, // Top left
      0.0,
      prefs.canvasHeight, // Bottom left
      prefs.canvasWidth,
      0.0, // Top right

      // Triangle 2
      0.0,
      prefs.canvasHeight, // Bottom left
      prefs.canvasWidth,
      prefs.canvasHeight, // Bottom right
      prefs.canvasWidth,
      0.0, // Top right
    ]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    return buffer
  }

  private setupRenderTextureUVBuffer = (gl: WebGL2RenderingContext) => {
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    const textureCoordinates = [
      // Triangle 1
      0.0,
      1.0, // Top left
      0.0,
      0.0, // Bottom left
      1.0,
      1.0, // Top right

      // Triangle 2
      0.0,
      0.0, // Bottom left
      1.0,
      0.0, // Bottom right
      1.0,
      1.0, // Top right
    ]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    return buffer
  }

  /**
   * @throws If unable to create vertex array
   */
  private setupRenderTextureVAO = (gl: WebGL2RenderingContext, attribute: number) => {
    const vao = gl.createVertexArray()

    if (!vao) throw new Error("Unable to create WebGL vertex array")

    gl.bindVertexArray(vao)

    gl.enableVertexAttribArray(attribute)

    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)

    // Unbind
    gl.bindVertexArray(null)

    return vao
  }

  /**
   * @throws If unable to create framebuffer
   */
  private setupRenderTextureFramebuffer = (gl: WebGL2RenderingContext, texture: WebGLTexture) => {
    const fb = gl.createFramebuffer()

    if (!fb) throw new Error("Unable to create WebGL framebuffer")

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return fb
  }

  private initRenderTexture = () => {
    const prefs = usePreferenceStore.getState().prefs

    const gl = this.gl

    this.renderBufferInfo.targetTexture = this.createRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight)
    gl.bindTexture(gl.TEXTURE_2D, this.renderBufferInfo.targetTexture)

    this.renderBufferInfo.framebuffer = this.setupRenderTextureFramebuffer(gl, this.renderBufferInfo.targetTexture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderBufferInfo.framebuffer)

    const { program, attributes, uniforms } = this.setupRenderTextureProgramAttributesUniforms(gl)
    this.renderProgramInfo.program = program
    this.renderProgramInfo.uniforms = uniforms

    this.renderProgramInfo.VBO = this.setupRenderTextureVBO(gl)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.renderProgramInfo.VBO)

    this.renderProgramInfo.VAO = this.setupRenderTextureVAO(gl, attributes.a_position)
    gl.bindVertexArray(this.renderProgramInfo.VAO)

    const uvBuffer = this.setupRenderTextureUVBuffer(gl)
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)

    gl.vertexAttribPointer(attributes.a_tex_coord, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(attributes.a_tex_coord)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindVertexArray(null)
  }

  private executeCurrentOperation = () => {
    if (!this.currentOperation) return
    const gl = this.gl

    gl.bindTexture(gl.TEXTURE_2D, this.renderBufferInfo.targetTexture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderBufferInfo.framebuffer)

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
    // gl.viewport(0, 0, canvasWidth, canvasHeight)

    // resizeCanvasToDisplaySize(this.canvasRef.current, () => (this.needRedraw = true))

    // if (this.currentLayer.noDraw) return

    // this.clear()
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

    Camera.updateViewProjectionMatrix(gl)

    const relativeMouseState = getRelativeMousePos(
      gl.canvas as HTMLCanvasElement,
      currentUIInteraction.current.mouseState,
    )

    if (
      currentUIInteraction.current.modifierState.has("space") &&
      relativeMouseState.leftMouseDown &&
      relativeMouseState.inbounds
    ) {
      if (startMoving) {
        vec2.transformMat3(
          tempPos,
          toClipSpace(relativeMouseState, gl.canvas as HTMLCanvasElement),
          startInvViewProjMat,
        )

        Camera.x = startCamPosition.x + (startPos[0] - tempPos[0])
        Camera.y = startCamPosition.y + (startPos[1] - tempPos[1])
      } else {
        startMoving = true

        mat3.copy(startInvViewProjMat, Camera.getInverseViewProjectionMatrix())

        vec2.transformMat3(
          tempPos,
          toClipSpace(relativeMouseState, gl.canvas as HTMLCanvasElement),
          startInvViewProjMat,
        )

        startCamPosition.x = Camera.x
        startCamPosition.y = Camera.y

        startPos[0] = tempPos[0]
        startPos[1] = tempPos[1]
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
        vec2.set(startPos, 0, 0)
        mat3.identity(startInvViewProjMat)
      }
    }

    gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    this.executeCurrentOperation()

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    TransparencyGrid.renderToScreen(gl)

    this.renderToScreen()

    checkfps(time, this.endInteraction)

    gl.flush()

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

    this.waitUntilInteractionEnd = false
    this.needRedraw = true
    positionFilter.reset()
    pressureFilter.reset()
    this.currentOperation.reset()

    if (save) {
      // this.currentLayer.addCurrentToUndoSnapshotQueue(this.gl)
    }

    // TODO: Debug mode menu option so these don't need to be commented on and off
    // debugPoints(this.gl, this.renderBufferInfo, this.currentOperation.points, "1., 0., 1., 1.")
    // debugPoints(this.gl, this.renderBufferInfo, redistributePoints(this.currentOperation!.points), "1., 1., 0., 1.")
  }

  /**
   * Set up everything we need
   *
   * This should be called before starting the render loop
   */
  public init = () => {
    const gl = this.gl

    mat3.translate(this.renderTextureMatrix, this.renderTextureMatrix, vec2.fromValues(0, 0))

    // const dimensions = vec2.fromValues(20, 20)
    // vec2.divide(dimensions, dimensions, vec2.fromValues(50, 50))

    // mat3.scale(this.renderTextureMatrix, this.renderTextureMatrix, dimensions)

    gl.depthFunc(gl.LEQUAL)
    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)

    // WebGL2 Float textures are supported by default
    const floatBufferExt = gl.getExtension("EXT_color_buffer_float")

    // Firefox will give an implicit enable warning if EXT_float_blend is enabled before EXT_color_buffer_float because the implicit EXT_color_buffer_float overrides it
    // this is not supported on iOS
    gl.getExtension("EXT_float_blend")
    gl.getExtension("OES_texture_float")
    const floatTextureLinearExt = gl.getExtension("OES_texture_float_linear")
    const halfFloatTextureExt = gl.getExtension("OES_texture_half_float")
    const halfFloatTextureLinearExt = gl.getExtension("OES_texture_half_float_linear")
    const halfFloatColorBufferExt = gl.getExtension("EXT_color_buffer_half_float")

    // TODO: 8bit fallback shouldn't be too hard now
    if (!floatBufferExt && (!halfFloatTextureExt || !halfFloatColorBufferExt))
      throw new Error("This device does not support float buffers")

    this.glInfo.supportedType = floatBufferExt
      ? gl.FLOAT
      : halfFloatTextureExt && halfFloatColorBufferExt
        ? halfFloatTextureExt.HALF_FLOAT_OES
        : gl.UNSIGNED_BYTE

    this.glInfo.supportedImageFormat = floatBufferExt
      ? gl.RGBA32F
      : halfFloatTextureExt && halfFloatColorBufferExt
        ? gl.RGBA16F
        : gl.RGBA

    this.glInfo.supportedMagFilterType = floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR : gl.NEAREST
    this.glInfo.supportedMinFilterType =
      floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST

    gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST)

    this.initRenderTexture()
    TransparencyGrid.init(gl)

    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })

    this.currentOperation = new Operation(this.currentTool)
  }

  /**
   * Draw render buffer texture to the canvas draw buffer
   */
  public renderToScreen = () => {
    const gl = this.gl

    // this.clear()

    gl.useProgram(this.renderProgramInfo.program)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, this.renderBufferInfo.targetTexture)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.renderProgramInfo.VBO)
    gl.bindVertexArray(this.renderProgramInfo.VAO)

    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)

    gl.generateMipmap(gl.TEXTURE_2D)

    gl.uniformMatrix3fv(this.renderProgramInfo.uniforms.u_matrix, false, Camera.project(this.renderTextureMatrix))

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindVertexArray(null)
  }

  /** Fill white on whatever the current WebGL state is */
  public clear = () => {
    const gl = this.gl

    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([1, 1, 1, 1]))
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
