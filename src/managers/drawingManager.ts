import { tool_types } from "@/constants.tsx"

import {
  getRelativeMousePos,
  getDistance,
  findQuadtraticBezierControlPoint,
  getCanvasColor,
  lerp,
  resizeCanvasToDisplaySize,
  performanceSafeguard,
} from "@/utils.ts"

import { ILayer, ITool, UIInteraction, MouseState, IOperation, MainStateType, AvailableTools } from "@/types.ts"
import { Operation } from "@/objects/Operation.ts"

import rtFragment from "@/shaders/TexToScreen/texToScreen.frag?raw"
import rtVertex from "@/shaders/TexToScreen/texToScreen.vert?raw"

// import * as m4 from '@/m4.ts'

import * as glUtils from "@/glUtils.ts"

// import * as v3 from '@/v3.ts'

import { tools } from "@/stores/ToolStore.ts"

const checkfps = performanceSafeguard()

class _DrawingManager {
  gl: WebGL2RenderingContext
  currentLayer: ILayer
  currentTool: ITool
  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  main: MainStateType

  constructor() {
    this.gl = {} as WebGL2RenderingContext
    this.currentLayer = {} as ILayer
    this.currentTool = {} as ITool
    this.currentOperation = new Operation({} as ITool)
    this.waitUntilInteractionEnd = false
    this.needRedraw = false
  }

  basePen = (operation: IOperation) => {
    const gl = this.gl
    const points = operation.points

    gl.lineCap = "round"
    gl.lineJoin = "round"
    gl.miterLimit = 10
    gl.strokeStyle = getCanvasColor(this.main.color, operation.tool.opacity)

    // TODO: make less lazy
    if (points.length < 3) {
      const point0 = points[0]
      const point1 = points[1]

      gl.beginPath()

      gl.moveTo(point0.x, point0.y)
      gl.lineTo(point1.x, point1.y)
      gl.stroke()
    } else {
      // We need to have slightly overlapping curves otherwise we likely have holes when the list of points is shortened
      for (let i = 2; i < points.length - 1; i += 1) {
        const startPoint = points[i - 2]
        const midPoint = points[i - 1]
        const endPoint = points[i]
        gl.beginPath()

        gl.moveTo(startPoint.x, startPoint.y)

        const controlPoint = findQuadtraticBezierControlPoint(startPoint, midPoint, endPoint)

        if (midPoint.pointerType === "pen") {
          gl.lineWidth = operation.tool.size! * midPoint.pressure
        } else {
          gl.lineWidth = operation.tool.size!
        }

        gl.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y)

        gl.stroke()
      }

      if (points.length % 3 < 3) {
        for (let i = points.length - (points.length % 3); i < points.length; i++) {
          const point0 = points[i - 1]
          const point1 = points[i]
          gl.beginPath()

          gl.moveTo(point0.x, point0.y)
          gl.lineTo(point1.x, point1.y)
          gl.stroke()
        }
      }
    }
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
    if (operation.points.length === 0 || operation.points.at(-1).drawn) return

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
    if (!operation.tool || Object.keys(operation.tool).length === 0) {
      operation.tool = this.currentTool
      operation.readyToDraw = true
    }

    if (this.waitUntilInteractionEnd) return
    let spacing = operation.tool.size * (operation.tool.spacing / 100)

    if (relativeMouseState.pointerType === "pen") {
      const pressure = relativeMouseState.pressure
      spacing = spacing * pressure
    }

    const prevPoint = operation.points.at(-1)

    const smoothing = 0.2
    const interpolatedPoint = { ...relativeMouseState }

    switch (operation.tool.type) {
      case tool_types.STROKE:
        if (operation.points.length !== 0) {
          interpolatedPoint.x = lerp(prevPoint.x, interpolatedPoint.x, smoothing)
          interpolatedPoint.y = lerp(prevPoint.y, interpolatedPoint.y, smoothing)

          interpolatedPoint.pressure = lerp(prevPoint.pressure, interpolatedPoint.pressure, 0.5)
        }

        if (operation.points.length === 0 || getDistance(prevPoint, interpolatedPoint) >= spacing) {
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

    // No filtering is supported on floating point textures
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

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

    gl.bindVertexArray(vao)

    gl.enableVertexAttribArray(attribute)

    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)

    // Unbind
    gl.bindVertexArray(null)

    return vao
  }

  setupRenderTextureFramebuffer = (gl: WebGL2RenderingContext, texture: WebGLTexture) => {
    const fb = gl.createFramebuffer()
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

    this.targetTexture = this.createRenderTexture(gl, targetTextureWidth, targetTextureHeight)
    gl.bindTexture(gl.TEXTURE_2D, this.targetTexture)

    this.textureFB = this.setupRenderTextureFramebuffer(gl, this.targetTexture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureFB)

    const { program, attributes } = this.setupRenderTextureProgramAndAttributes(gl)
    this.rtProgram = program

    this.rtVBO = this.setupRenderTextureVBO(gl)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rtVBO)

    this.rtVAO = this.setupRenderTextureVAO(gl, attributes.a_position)
    gl.bindVertexArray(this.rtVAO)

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

    const floatBufferExt = gl.getExtension("EXT_color_buffer_float")
    const floatTextureExt = gl.getExtension("OES_texture_float_linear")

    if (!floatBufferExt || !floatTextureExt) {
      throw new Error(
        "Your device does not support floating point textures/buffers. The dev should implement 8bit fallback.",
      )
    }

    this.initRenderTexture()

    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })
  }

  executeCurrentOperation = () => {
    const gl = this.gl

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.bindTexture(gl.TEXTURE_2D, this.targetTexture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureFB)

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

    gl.bindTexture(gl.TEXTURE_2D, this.targetTexture)
    gl.useProgram(this.rtProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rtVBO)
    gl.bindVertexArray(this.rtVAO)

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

    resizeCanvasToDisplaySize(this.canvasRef.current, () => (this.needRedraw = true))

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

    const relativeMouseState = getRelativeMousePos(this.gl.canvas, currentUIInteraction.current.mouseState)

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

  // undo = () => {
  //   if (this.currentLayer.undoSnapshotQueue.length > 0 && this.currentOperation.points.length === 0) {
  //     this.currentLayer.redoSnapshotQueue.push(this.currentLayer.undoSnapshotQueue.pop())
  //   }
  //   this.endInteraction(false)
  // }
}

export const DrawingManager = new _DrawingManager()
