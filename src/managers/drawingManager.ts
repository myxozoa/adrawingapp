import { MutableRefObject } from "react"

import { usePreferenceStore } from "@/stores/PreferenceStore"
import { tools } from "@/stores/ToolStore.ts"

import { tool_types } from "@/constants.tsx"

import {
  getRelativeMousePos,
  getDistance,
  // findQuadtraticBezierControlPoint,
  // getCanvasColor,
  lerp,
  // resizeCanvasToDisplaySize,
  performanceSafeguard,
} from "@/utils.ts"

import { ILayer, UIInteraction, MouseState, IOperation, AvailableTools, IBrush } from "@/types.ts"
import { Operation } from "@/objects/Operation.ts"

import rtFragment from "@/shaders/TexToScreen/texToScreen.frag?raw"
import rtVertex from "@/shaders/TexToScreen/texToScreen.vert?raw"

// import * as m4 from '@/m4.ts'

import * as glUtils from "@/glUtils.ts"

// import * as v3 from '@/v3.ts'

const checkfps = performanceSafeguard()

class _DrawingManager {
  gl: WebGL2RenderingContext
  currentLayer: ILayer
  currentTool: AvailableTools
  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  canvasRef: MutableRefObject<HTMLCanvasElement>

  renderProgramInfo: {
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation>
    attributes: Record<string, GLint>
    VBO: WebGLBuffer
    VAO: WebGLBuffer
  }

  renderBufferInfo: {
    targetTexture: WebGLTexture
    framebuffer: WebGLFramebuffer
  }

  constructor() {
    this.gl = {} as WebGL2RenderingContext
    this.currentLayer = {} as ILayer
    this.currentTool = {} as AvailableTools
    this.currentOperation = new Operation({} as IBrush)
    this.waitUntilInteractionEnd = false
    this.needRedraw = false

    this.renderBufferInfo = {} as unknown as typeof this.renderBufferInfo
    this.renderProgramInfo = {} as unknown as typeof this.renderProgramInfo
  }

  fill = () => {
    // this.gl.globalCompositeOperation ="source-over"
    // this.currentLayer.fill(getCanvasColor(this.main.color))
  }

  clear = () => {
    const gl = this.gl

    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([1, 1, 1, 1]))
  }

  // TODO: This framework isnt generic enough to describe many non-drawing tools
  execute = (operation: IOperation) => {
    if (operation.points.length === 0 || operation.points.at(-1)!.drawn) return

    if (operation.tool.use) operation.tool.use(this.gl, operation)
    if (operation.tool.draw) operation.tool.draw(this.gl, operation)
  }

  swapTool = (tool: AvailableTools) => {
    this.currentTool = tool
    this.currentOperation = new Operation(this.currentTool)
  }

  endInteraction = (save = true) => {
    if (this.currentLayer.noDraw) return

    this.waitUntilInteractionEnd = false
    this.needRedraw = true

    if (save) {
      // this.currentLayer.addCurrentToUndoSnapshotQueue(this.gl)
    }
    this.currentOperation = new Operation(this.currentTool)
  }

  use = (relativeMouseState: MouseState, operation: IOperation) => {
    const prefs = usePreferenceStore.getState().prefs
    if (!operation.tool || Object.keys(operation.tool).length === 0) {
      operation.tool = this.currentTool
      operation.readyToDraw = true
    }

    if (this.waitUntilInteractionEnd) return
    let spacing = operation.tool.size * (operation.tool.spacing / 100)

    if (relativeMouseState.pointerType === "pen") {
      const pressure = relativeMouseState.pressure
      spacing = spacing * (pressure * prefs.pressureSensititity)
    }

    const prevPoint = operation.points.at(-1)

    const smoothing = 0.5
    const interpolatedPoint = { ...relativeMouseState }

    switch (operation.tool.type) {
      case tool_types.STROKE:
        if (prevPoint && operation.points.length !== 0) {
          interpolatedPoint.x = lerp(prevPoint.x, interpolatedPoint.x, smoothing)
          interpolatedPoint.y = lerp(prevPoint.y, interpolatedPoint.y, smoothing)

          interpolatedPoint.pressure = lerp(prevPoint.pressure, interpolatedPoint.pressure, 0.5)
        }

        if (operation.points.length === 0 || (prevPoint && getDistance(prevPoint, interpolatedPoint) >= spacing)) {
          operation.points.push({ ...interpolatedPoint, drawn: false })

          if (operation.points.length > 6) {
            operation.points.shift()
          }
        }
        break

      case tool_types.POINT:
        this.waitUntilInteractionEnd = true

        operation.points.push({ ...interpolatedPoint, drawn: false })
        break
    }
  }

  createRenderTexture = (gl: WebGL2RenderingContext, width: number, height: number) => {
    const texture = gl.createTexture()

    if (!texture) {
      throw new Error("Error creating render texture")
    }

    gl.bindTexture(gl.TEXTURE_2D, texture)

    const floatBufferExt = gl.getExtension("EXT_color_buffer_float")

    const floatTextureLinearExt = gl.getExtension("OES_texture_float_linear")

    if (!floatBufferExt) {
      const halfFloatTextureExt = gl.getExtension("OES_texture_half_float")

      if (!halfFloatTextureExt) {
        throw new Error("Your device does not support half float textures (OES_texture_half_float).")
      }

      const halfFloatTextureLinearExt = gl.getExtension("OES_texture_half_float_linear")

      // if (!halfFloatTextureLinearExt) {
      //   throw new Error(
      //     "Your device does not support linear filtering on half float textures (OES_texture_half_float_linear).",
      //   )
      // }

      const halfFloatColorBufferExt = gl.getExtension("EXT_color_buffer_half_float")

      if (!halfFloatColorBufferExt) {
        throw new Error("Your device does not support half float color buffers (EXT_color_buffer_half_float).")
      }

      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        width,
        height,
        0,
        gl.RGBA,
        halfFloatTextureExt.HALF_FLOAT_OES,
        new Float32Array(width * height * 4).fill(1),
      )

      const supportedFilterType = halfFloatTextureLinearExt ? gl.LINEAR : gl.NEAREST

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, supportedFilterType)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, supportedFilterType)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    } else {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        width,
        height,
        0,
        gl.RGBA,
        gl.FLOAT,
        new Float32Array(width * height * 4).fill(1),
      )

      const supportedFilterType = floatTextureLinearExt ? gl.LINEAR : gl.NEAREST

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, supportedFilterType)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, supportedFilterType)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    }

    // Unbind
    gl.bindTexture(gl.TEXTURE_2D, null)

    return texture
  }

  setupRenderTextureProgramAndAttributes = (gl: WebGL2RenderingContext) => {
    const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, rtFragment)
    const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, rtVertex)

    const program = glUtils.createProgram(gl, vertexShader, fragmentShader)

    const attributeNames = ["a_position", "a_tex_coord"]

    const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)

    return { attributes, program }
  }

  setupRenderTextureVBO = (gl: WebGL2RenderingContext) => {
    const buffer = gl.createBuffer()

    if (!buffer) throw new Error("Unable to create WebGL vertex buffer")

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

    const positions = [
      // Triangle 1
      -1.0,
      1.0, // Top left
      -1.0,
      -1.0, // Bottom left
      1.0,
      1.0, // Top right

      // Triangle 2
      -1.0,
      -1.0, // Bottom left
      1.0,
      -1.0, // Bottom right
      1.0,
      1.0, // Top right
    ]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    return buffer
  }

  setupRenderTextureUVBuffer = (gl: WebGL2RenderingContext) => {
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

  setupRenderTextureVAO = (gl: WebGL2RenderingContext, attribute: number) => {
    const vao = gl.createVertexArray()

    if (!vao) throw new Error("Unable to create WebGL vertex array")

    gl.bindVertexArray(vao)

    gl.enableVertexAttribArray(attribute)

    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)

    // Unbind
    gl.bindVertexArray(null)

    return vao
  }

  setupRenderTextureFramebuffer = (gl: WebGL2RenderingContext, texture: WebGLTexture) => {
    const fb = gl.createFramebuffer()

    if (!fb) throw new Error("Unable to create WebGL framebuffer")

    gl.bindFramebuffer(gl.FRAMEBUFFER, fb)

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

    // Unbind
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    return fb
  }

  initRenderTexture = () => {
    const gl = this.gl

    const targetTextureWidth = gl.canvas.width
    const targetTextureHeight = gl.canvas.height

    this.renderBufferInfo.targetTexture = this.createRenderTexture(gl, targetTextureWidth, targetTextureHeight)
    gl.bindTexture(gl.TEXTURE_2D, this.renderBufferInfo.targetTexture)

    this.renderBufferInfo.framebuffer = this.setupRenderTextureFramebuffer(gl, this.renderBufferInfo.targetTexture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderBufferInfo.framebuffer)

    const { program, attributes } = this.setupRenderTextureProgramAndAttributes(gl)
    this.renderProgramInfo.program = program

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

  init = () => {
    const gl = this.gl

    gl.depthFunc(gl.LEQUAL)
    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)

    this.initRenderTexture()

    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })
  }

  executeCurrentOperation = () => {
    const gl = this.gl

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.bindTexture(gl.TEXTURE_2D, this.renderBufferInfo.targetTexture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderBufferInfo.framebuffer)

    if (this.currentOperation.tool.switchTo) this.currentOperation.tool.switchTo(gl)

    this.execute(this.currentOperation)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindVertexArray(null)
  }

  renderToScreen = () => {
    const gl = this.gl

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.bindTexture(gl.TEXTURE_2D, this.renderBufferInfo.targetTexture)
    gl.useProgram(this.renderProgramInfo.program)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.renderProgramInfo.VBO)
    gl.bindVertexArray(this.renderProgramInfo.VAO)

    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindVertexArray(null)
  }

  loop = (currentUIInteraction: React.MutableRefObject<UIInteraction>, time: number) => {
    const gl = this.gl

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

    const relativeMouseState = getRelativeMousePos(
      this.gl.canvas as HTMLCanvasElement,
      currentUIInteraction.current.mouseState,
    )

    if (currentUIInteraction.current.mouseState.leftMouseDown && relativeMouseState.inbounds) {
      this.use(relativeMouseState, this.currentOperation)
    }

    this.executeCurrentOperation()

    this.renderToScreen()

    const error = gl.getError()

    if (error !== gl.NO_ERROR) {
      console.error("WebGL error: " + error)
    }

    checkfps(time)

    requestAnimationFrame((time) => this.loop(currentUIInteraction, time))
  }

  undo = () => {
    //   if (this.currentLayer.undoSnapshotQueue.length > 0 && this.currentOperation.points.length === 0) {
    //     this.currentLayer.redoSnapshotQueue.push(this.currentLayer.undoSnapshotQueue.pop())
    //   }
    //   this.endInteraction(false)
  }
}

export const DrawingManager = new _DrawingManager()
