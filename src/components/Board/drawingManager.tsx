import { tool_list, tool_types } from '../../constants'

import { getRelativeMousePos, getDistance, findQuadtraticBezierControlPoint, getCanvasColor, lerp, resizeCanvasToDisplaySize, scaleNumberToRange } from '../../utils'

import { ILayer, ITool, Point, UIInteraction, MouseState, IOperation, MainStateType } from '../../types'
import { Operation } from '../../objects/Operation'

import brushFragment from '../../shaders/Brush/brush.frag?raw'
import brushVertex from '../../shaders/Brush/brush.vert?raw'

import rtFragment from '../../shaders/TexToScreen/texToScreen.frag?raw'
import rtVertex from '../../shaders/TexToScreen/texToScreen.vert?raw'

import { useMainStore } from '../../stores/MainStore'

import * as m4 from '../../m4.ts'

import * as glUtils from '../../glUtils'

import * as v3 from '../../v3.ts'

import { calculateHardness } from '../../utils'

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

    this.toolBelt = {
      [tool_list.PEN]: this.penDraw,
      [tool_list.BRUSH]: this.brushDraw,
      [tool_list.ERASER]: this.erase,
      [tool_list.FILL]: this.fill
    }
  }

  basePen = (operation: IOperation) => {
    const gl = this.gl
    const points = operation.points

    gl.lineCap = 'round'
    gl.lineJoin = 'round'
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
        
        if (midPoint.pointerType === 'pen') {
          gl.lineWidth = operation.tool.size! * midPoint.pressure
        } else {
          gl.lineWidth = operation.tool.size!
        }
        
        gl.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y)

        gl.stroke()
      }

      if (points.length % 3 < 3) {
        for (let i = points.length - points.length % 3; i < points.length; i++) {
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

  stamp = (point: Point) => {
    const gl = this.gl

    const color = useMainStore.getState().color

    let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1)

    const locationVector = v3.create(point.x, point.y, 0)
  
    matrix = m4.translate(matrix, locationVector)
  
    const baseSize = 100

    let size = 40 - scaleNumberToRange(this.currentTool.size, 1, 50, 10, 38)

    if (point.pointerType === "pen") {
      const pressure = point.pressure
      size = size / pressure
    }

    const scaleVector = v3.create(baseSize, baseSize, 1)
  
    matrix = m4.scale(matrix, scaleVector)
  
    gl.uniformMatrix4fv(this.uniforms.u_matrix, true, matrix)

    gl.uniform2f(this.uniforms.u_resolution, 100, 100)
    gl.uniform2f(this.uniforms.u_point, point.x, gl.canvas.height - point.y)
    gl.uniform3fv(this.uniforms.u_brush_color, color.map(c => c / 255))
    gl.uniform1f(this.uniforms.u_softness, calculateHardness(this.currentTool.hardness, this.currentTool.size) / 100)
    gl.uniform1f(this.uniforms.u_size, size)
    gl.uniform1f(this.uniforms.u_flow, this.currentTool.flow / 100)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    point.drawn = true
  }

  brushLine = (operation: IOperation, point0: Point, point1: Point) => {
    const distance = getDistance(point0, point1)
    const step = operation.tool.size * (operation.tool.spacing / 100)

    // Stamp at space interval between the two points
    for (let i = 0; i < distance; i += step) {
      const t = Math.max(0, Math.min(1, i / distance))
      const x = point0.x + (point1.x - point0.x) * t
      const y = point0.y + (point1.y - point0.y) * t

      const pressure = lerp(point0.pressure, point1.pressure, 0.5)
      
      this.stamp({x, y, pointerType: point0.pointerType, pressure })
    }
  }

  baseBrush = (operation: IOperation) => {
    const lastIndex = operation.points.length - 1
    const prevPoint = operation.points.at(-2)
    const currentPoint = operation.points.at(-1)

    const distance = getDistance(prevPoint, currentPoint)

    if (lastIndex === 0) {
      this.stamp(operation.points[0])
      return
    }

    let spacing = operation.tool.size * (operation.tool.spacing / 100)

    if (currentPoint.pointerType === "pen") {
      const pressure = currentPoint.pressure
      spacing = spacing * pressure
    }

    if (distance > spacing * 2) {
      this.brushLine(operation, prevPoint, currentPoint)
      prevPoint.drawn = true
      currentPoint.drawn = true
    } else {
      this.stamp(currentPoint)
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

  erase = (operation: IOperation) => {
    const gl = this.gl

    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT)
  
    this.baseBrush(operation)
  }

  brushDraw = (operation: IOperation) => {
    const gl = this.gl

    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.blendEquation(gl.FUNC_ADD)
  
    this.baseBrush(operation)
  }
  
  penDraw = (operation: IOperation) => {
    // if (this.currentOperation.points.length <= 1) return

    // this.gl.globalCompositeOperation ="source-over";
  
    // this.basePen(operation)
  }

  draw = (operation: IOperation) => {
    if (operation.points.length === 0 || operation.points.at(-1).drawn) return

    this.toolBelt[operation.tool.name](operation)
  }
  
  endInteraction = (save = true) => {
    if (this.currentLayer.noDraw) return
    
    this.waitUntilInteractionEnd = false
    this.needRedraw = true

    if (save) {
      this.currentLayer.addCurrentToUndoSnapshotQueue(this.gl)
      this.currentOperation = new Operation(this.currentTool)
    }
  }

  use = (relativeMouseState: MouseState, operation: IOperation) => {
    if (!operation.tool) {
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

    const smoothing = 0.4
    const interpolatedPoint = { ...relativeMouseState  }
    
    switch(operation.tool.type) {
      case tool_types.STROKE:
        if (operation.points.length !== 0) {
          interpolatedPoint.x = lerp(prevPoint.x, interpolatedPoint.x, smoothing)
          interpolatedPoint.y = lerp(prevPoint.y, interpolatedPoint.y, smoothing)

          interpolatedPoint.pressure = lerp(prevPoint.pressure, interpolatedPoint.pressure, 0.5)
        }

        if (operation.points.length === 0 || getDistance(prevPoint, interpolatedPoint) >= spacing) {

          operation.points.push({...interpolatedPoint, drawn: false })

          if (operation.points.length > 6) {
            operation.points.shift()
          }
        }
        break

      case tool_types.POINT:
        this.waitUntilInteractionEnd = true
        break
    }
  }

  setupBrushProgramAndAttributeUniforms = (gl: WebGL2RenderingContext) => {
    const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, brushFragment)
    const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, brushVertex)
  
    const program = glUtils.createProgram(gl, vertexShader, fragmentShader)
  
    const attributeNames = ["a_position"]

    const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)
  
    const uniformNames = ["u_matrix", "u_point", "u_resolution", "u_brush_color", "u_softness", "u_size", "u_flow"]
  
    const uniforms = glUtils.getUniformLocations(gl, program, uniformNames)

    return { program, attributes, uniforms }
  }

  setupBrushVBO = (gl: WebGL2RenderingContext) => {
    const vbo = gl.createBuffer()
  
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
  
    const positions = [
      // Triangle 1
      -1.0,  1.0, // Top left
      -1.0, -1.0, // Bottom left
       1.0,  1.0, // Top right
  
      // Triangle 2
      -1.0, -1.0, // Bottom left
       1.0, -1.0, // Bottom right
       1.0,  1.0,  // Top right
  ]

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)

    return vbo
  }

  setupBrushVAO = (gl: WebGL2RenderingContext, attribute: number) => {
    const vao = gl.createVertexArray()

    gl.bindVertexArray(vao)
  
    gl.enableVertexAttribArray(attribute)
  
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)

    // Unbind
    gl.bindVertexArray(null)

    return vao
  }

  initBrush = () => {
    const gl = this.gl

    const { program, attributes, uniforms } = this.setupBrushProgramAndAttributeUniforms(gl)
    this.brushProgram = program
    this.uniforms = uniforms
  
    this.brushVBO = this.setupBrushVBO(gl)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.brushVBO)

    this.brushVAO = this.setupBrushVAO(gl, attributes.a_position)
    gl.bindVertexArray(this.brushVAO)
  
    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  createRenderTexture = (gl: WebGL2RenderingContext, width: number, height: number) => {
    const texture = gl.createTexture()

    if (!texture) {
      throw new Error("Error creating render texture")
    }

    gl.bindTexture(gl.TEXTURE_2D, texture)
    
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F,
                  width, height, 0,
                  gl.RGBA, gl.FLOAT, new Float32Array(width * height * 4).fill(1))
  
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
      -1.0,  1.0, // Top left
      -1.0, -1.0, // Bottom left
       1.0,  1.0, // Top right
  
      // Triangle 2
      -1.0, -1.0, // Bottom left
       1.0, -1.0, // Bottom right
       1.0,  1.0,  // Top right
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
      0.0, 1.0, // Top left
      0.0, 0.0, // Bottom left
      1.0, 1.0, // Top right

      // Triangle 2
      0.0, 0.0, // Bottom left
      1.0, 0.0, // Bottom right
      1.0, 1.0,  // Top right
  ]

    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(textureCoordinates),
      gl.STATIC_DRAW,
    )

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

    gl.vertexAttribPointer(
      attributes.a_tex_coord,
      2,
      gl.FLOAT,
      false,
      0,
      0,
    )
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
      throw new Error("Does not support floating point textures/buffers. The dev should implement 8bit fallback.")
    }

    this.initRenderTexture()
    this.initBrush()
  }

  drawCurrentOperation = () => {
    const gl = this.gl
  
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    
    gl.useProgram(this.brushProgram)
    gl.bindTexture(gl.TEXTURE_2D, this.targetTexture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureFB)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.brushVBO)
    gl.bindVertexArray(this.brushVAO)
    
    this.draw(this.currentOperation)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindVertexArray(null)
  }

  render = () => {
    const gl = this.gl

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  
    gl.bindTexture(gl.TEXTURE_2D, this.targetTexture)
    gl.useProgram(this.rtProgram)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rtVBO)
    gl.bindVertexArray(this.rtVAO)

    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindVertexArray(null)
  }

  loop = (currentUIInteraction: React.MutableRefObject<UIInteraction>) => {
    const gl = this.gl
  
    resizeCanvasToDisplaySize(this.canvasRef.current, () => this.needRedraw = true)
  
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

    this.drawCurrentOperation()
    
    this.render()

    const error = gl.getError()

    if (error !== gl.NO_ERROR) {
        console.error("WebGL error: " + error)
    }    

    requestAnimationFrame(() => this.loop(currentUIInteraction))
  }
  
  undo = () => {
    if (this.currentLayer.undoSnapshotQueue.length > 0 && this.currentOperation.points.length === 0) {
      this.currentLayer.redoSnapshotQueue.push(this.currentLayer.undoSnapshotQueue.pop())
    }
    this.endInteraction(false)
  }
}

export const DrawingManager = new _DrawingManager()