import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { IBrush, IOperation, Point } from "@/types"

import { useMainStore } from "@/stores/MainStore"

import brushFragment from "@/shaders/Brush/brush.frag?raw"
import brushVertex from "@/shaders/Brush/brush.vert?raw"

import { calculateHardness, getDistance, lerp } from "@/utils"

import * as v3 from "@/v3.ts"
import * as m4 from "@/m4.ts"
import * as glUtils from "@/glUtils"
import { tool_list } from "@/constants"

export class Brush extends Tool implements IBrush {
  size: number
  flow: number
  opacity: number
  hardness: number
  spacing: number

  // TODO: Type this
  programInfo: {
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation>
    attributes: Record<string, GLint>
    VBO: WebGLBuffer
    VAO: WebGLBuffer
  }

  constructor(settings: Partial<IBrush> = {}) {
    super()
    this.name = tool_list.BRUSH
    setWithDefaults.call(this, settings, toolDefaults.BRUSH)

    this.programInfo = {} as unknown as typeof this.programInfo
  }

  setupProgramAndAttributeUniforms = (gl: WebGL2RenderingContext) => {
    const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, brushFragment)
    const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, brushVertex)

    const program = glUtils.createProgram(gl, vertexShader, fragmentShader)

    const attributeNames = ["a_position"]

    const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)

    const uniformNames = [
      "u_matrix",
      "u_point",
      "u_resolution",
      "u_brush_color",
      "u_softness",
      "u_size",
      "u_flow",
      "u_random",
    ]

    const uniforms = glUtils.getUniformLocations(gl, program, uniformNames)

    return { program, attributes, uniforms }
  }

  setupVBO = (gl: WebGL2RenderingContext) => {
    const vbo = gl.createBuffer()

    if (!vbo) throw new Error("Unable to create WebGL Vertex Buffer")

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)

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

    return vbo
  }

  setupVAO = (gl: WebGL2RenderingContext, attribute: number) => {
    const vao = gl.createVertexArray()

    if (!vao) throw new Error("Unable to create WebGL Vertex Array")

    gl.bindVertexArray(vao)

    gl.enableVertexAttribArray(attribute)

    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)

    // Unbind
    gl.bindVertexArray(null)

    return vao
  }

  init = (gl: WebGL2RenderingContext) => {
    const { program, attributes, uniforms } = this.setupProgramAndAttributeUniforms(gl)
    this.programInfo.program = program
    this.programInfo.uniforms = uniforms

    this.programInfo.VBO = this.setupVBO(gl)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.programInfo.VBO)

    this.programInfo.VAO = this.setupVAO(gl, attributes.a_position)
    gl.bindVertexArray(this.programInfo.VAO)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  draw = (gl: WebGL2RenderingContext, operation: IOperation) => {
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.blendEquation(gl.FUNC_ADD)

    this.base(gl, operation)
  }

  base = (gl: WebGL2RenderingContext, operation: IOperation) => {
    const lastIndex = operation.points.length - 1
    const prevPoint = operation.points.at(-2)
    const currentPoint = operation.points.at(-1)

    if (!prevPoint || !currentPoint) return

    const distance = getDistance(prevPoint, currentPoint)

    if (lastIndex === 0) {
      this.stamp(gl, operation.points[0])
      return
    }

    let spacing = this.size * (this.spacing / 100)

    if (currentPoint.pointerType === "pen") {
      const pressure = currentPoint.pressure
      spacing = spacing * pressure
    }

    if (distance > spacing * 2) {
      this.line(gl, prevPoint, currentPoint)
      prevPoint.drawn = true
      currentPoint.drawn = true
    } else {
      this.stamp(gl, currentPoint)
    }
  }

  line = (gl: WebGL2RenderingContext, point0: Point, point1: Point) => {
    const distance = getDistance(point0, point1)
    const step = this.size * (this.spacing / 100)

    let progress = 0
    const steps = distance / step

    // Stamp at evenly spaced intervals between the two points
    for (let i = 0; i < distance; i += step) {
      const t = Math.max(0, Math.min(1, i / distance))
      const x = point0.x + (point1.x - point0.x) * t
      const y = point0.y + (point1.y - point0.y) * t

      const pressure = lerp(point0.pressure, point1.pressure, progress / steps)

      this.stamp(gl, { x, y, pointerType: point0.pointerType, pressure })

      progress++
    }
  }

  stamp = (gl: WebGL2RenderingContext, point: Point) => {
    const color = useMainStore.getState().color

    let matrix = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1, null)

    const locationVector = v3.create(point.x, point.y, 0)

    matrix = m4.translate(matrix, locationVector, null)

    const baseSize = 100

    let size = this.size

    if (point.pointerType === "pen") {
      const pressure = point.pressure
      size = size * pressure
    }

    const scaleVector = v3.create(baseSize, baseSize, 1)

    matrix = m4.scale(matrix, scaleVector, null)

    gl.uniformMatrix4fv(this.programInfo.uniforms.u_matrix, true, matrix)

    gl.uniform2f(this.programInfo.uniforms.u_resolution, 100, 100)
    gl.uniform2f(this.programInfo.uniforms.u_point, point.x, gl.canvas.height - point.y)
    gl.uniform3fv(
      this.programInfo.uniforms.u_brush_color,
      color.map((c) => c / 255),
    )
    gl.uniform1f(this.programInfo.uniforms.u_softness, calculateHardness(this.hardness, size) / 100)
    gl.uniform1f(this.programInfo.uniforms.u_size, size)
    gl.uniform1f(this.programInfo.uniforms.u_flow, this.flow / 100)
    gl.uniform1f(this.programInfo.uniforms.u_random, Math.random())

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    point.drawn = true
  }

  switchTo = (gl: WebGL2RenderingContext) => {
    gl.useProgram(this.programInfo.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.programInfo.VBO)
    gl.bindVertexArray(this.programInfo.VAO)
  }
}
