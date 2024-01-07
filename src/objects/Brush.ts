import { Tool, toolDefaults, toolProperties } from "@/objects/Tool"
import { IBrush, IOperation, IPoint } from "@/types"

import { useMainStore } from "@/stores/MainStore"
import { usePreferenceStore } from "@/stores/PreferenceStore"

import { Point } from "@/objects/Point"

import brushFragment from "@/shaders/Brush/brush.frag?raw"
import brushVertex from "@/shaders/Brush/brush.vert?raw"

import { getDistance, lerp, newPointAlongDirection, redistributePoints, cubicBezier } from "@/utils"

import { mat4, vec3 } from "gl-matrix"

import * as glUtils from "@/glUtils"
import { tool_list } from "@/constants"

const baseSize = 100

const drawnPoints: Record<string, boolean> = {}

export class Brush extends Tool implements IBrush {
  settings: {
    size: number
    flow: number
    opacity: number
    hardness: number
    spacing: number
  }

  glInfo: {
    matrix: mat4
    scaleVector: vec3
  }

  programInfo: {
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation>
    attributes: Record<string, GLint>
    VBO: WebGLBuffer
    VAO: WebGLBuffer
  }

  constructor(settings: Partial<IBrush["settings"]> = {}) {
    super()
    this.name = tool_list.BRUSH
    this.settings = {} as IBrush["settings"]

    Object.assign(this, toolProperties.BRUSH)
    Object.assign(this.settings, toolDefaults.BRUSH)
    Object.assign(this.settings, settings)

    this.programInfo = {} as unknown as typeof this.programInfo
    this.glInfo = {} as unknown as typeof this.glInfo
  }

  private setupProgramAndAttributeUniforms = (gl: WebGL2RenderingContext) => {
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

  private setupVBO = (gl: WebGL2RenderingContext) => {
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

  private setupVAO = (gl: WebGL2RenderingContext, attribute: number) => {
    const vao = gl.createVertexArray()

    if (!vao) throw new Error("Unable to create WebGL Vertex Array")

    gl.bindVertexArray(vao)

    gl.enableVertexAttribArray(attribute)

    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)

    // Unbind
    gl.bindVertexArray(null)

    return vao
  }

  private base = (gl: WebGL2RenderingContext, operation: IOperation) => {
    const points = redistributePoints(operation.points)
    const prevPrevPrevPoint = points.at(-4)!
    const prevPrevPoint = points.at(-3)!
    const prevPoint = points.at(-2)!
    const currentPoint = points.at(-1)!

    if (!prevPoint || points.length <= 1) {
      this.stamp(gl, currentPoint)

      return
    }

    if (points.length <= 3) {
      if (!drawnPoints[vec3.str(currentPoint.location)]) {

        this.line(gl, prevPoint, currentPoint)
        drawnPoints[vec3.str(currentPoint.location)] = true
        drawnPoints[vec3.str(prevPoint.location)] = true
      }
    } else {
      if (!drawnPoints[vec3.str(currentPoint.location)] &&
      !drawnPoints[vec3.str(prevPoint.location)] &&
      !drawnPoints[vec3.str(prevPrevPoint.location)]) {
        this.splineProcess(gl, points)
        drawnPoints[vec3.str(currentPoint.location)] = true
        drawnPoints[vec3.str(prevPoint.location)] = true
        drawnPoints[vec3.str(prevPrevPoint.location)] = true
        drawnPoints[vec3.str(prevPrevPrevPoint.location)] = true
      }
    }

    gl.flush()
  }

  /**
   * Process array of points as spline
   *
   * @param points length > 4
   */
  private splineProcess = (gl: WebGL2RenderingContext, points: IPoint[]) => {
    const i = points.length - 4
    const start = points[i]
    const control = points[i + 1]
    const control2 = points[i + 2]
    const end = points[i + 3]

    this.spline(gl, start, control, control2, end)
  }

  /**
   * Interpret the points as a bezier curve and stamp along it
   */
  private spline = (gl: WebGL2RenderingContext, start: IPoint, control: IPoint, control2: IPoint, end: IPoint) => {
    const stampSpacing = this.settings.size * (this.settings.spacing / 100)

    // https://stackoverflow.com/questions/29438398/cheap-way-of-calculating-cubic-bezier-length
    const chord = getDistance(start, end)
    const totalDistance = getDistance(end, control2) + getDistance(control2, control) + getDistance(control, start)
    const estimatedArcLength = (totalDistance + chord) / 2

    const steps = estimatedArcLength / stampSpacing

    // Stamp points along cubic bezier
    for (let t = 0, j = 0; t <= 1; t += 1 / steps, j++) {
      this.stamp(gl, cubicBezier(start, control, control2, end, t, j / steps))
    }
  }

  /**
   * Stamps along line between `start` and `end`
   */
  private line = (gl: WebGL2RenderingContext, start: IPoint, end: IPoint) => {
    const distance = getDistance(start, end)
    const stampSpacing = this.settings.size * (this.settings.spacing / 100)

    const steps = distance / stampSpacing

    // Stamp at evenly spaced intervals between the two points
    for (let i = stampSpacing, j = 0; i < distance; i += stampSpacing, j++) {
      const { x, y } = newPointAlongDirection(start, end, i)

      this.stamp(
        gl,
        new Point({ x, y, pointerType: start.pointerType, pressure: lerp(start.pressure, end.pressure, j / steps) }),
      )
    }
    this.stamp(gl, end)
  }

  /**
   * Moves quad around and draws it based on brush settings and point info
   */
  private stamp = (gl: WebGL2RenderingContext, point: IPoint) => {
    const prefs = usePreferenceStore.getState().prefs

    mat4.ortho(this.glInfo.matrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1)
    mat4.translate(this.glInfo.matrix, this.glInfo.matrix, point.location)
    mat4.scale(this.glInfo.matrix, this.glInfo.matrix, this.glInfo.scaleVector)

    let size = this.settings.size

    if (point.pointerType === "pen") {
      size -= (1 - Math.pow(point.pressure, prefs.pressureSensitivity)) * size
    }

    // Internals

    gl.uniformMatrix4fv(this.programInfo.uniforms.u_matrix, true, this.glInfo.matrix)
    gl.uniform2f(this.programInfo.uniforms.u_point, point.x, gl.canvas.height - point.y)

    // Brush settings

    gl.uniform1f(this.programInfo.uniforms.u_size, size / 100)
    // gl.uniform1f(this.programInfo.uniforms.u_random, Math.random())

    // Drawing

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  /** Initialize necessary WebGL resources
   *
   *  Should be called once
   */
  public init = (gl: WebGL2RenderingContext) => {
    const { program, attributes, uniforms } = this.setupProgramAndAttributeUniforms(gl)
    this.programInfo.program = program
    this.programInfo.uniforms = uniforms

    this.glInfo.matrix = mat4.create()
    this.glInfo.scaleVector = vec3.fromValues(baseSize, baseSize, 1)

    // VBO

    this.programInfo.VBO = this.setupVBO(gl)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.programInfo.VBO)

    // VAO

    this.programInfo.VAO = this.setupVAO(gl, attributes.a_position)
    gl.bindVertexArray(this.programInfo.VAO)

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  /**
   * Begin the drawing process
   *
   * MUST have called this Brush's switchTo method
   *
   * @param operation uses this operations points to know where to draw
   */
  public draw = (gl: WebGL2RenderingContext, operation: IOperation) => {
    if (operation.points.length === 0) return

    const color = useMainStore.getState().color

    gl.uniform2f(this.programInfo.uniforms.u_resolution, baseSize, baseSize)
    const colors = color.map((c) => c / 255)
    gl.uniform3f(this.programInfo.uniforms.u_brush_color, colors[0], colors[1], colors[2])
    gl.uniform1f(this.programInfo.uniforms.u_softness, this.settings.hardness / 100)
    gl.uniform1f(this.programInfo.uniforms.u_flow, this.settings.flow / 100)

    this.base(gl, operation)
  }

  /** Switch WebGL state to what we need
   *
   *  MUST be called every time before a usage operation
   */
  public switchTo = (gl: WebGL2RenderingContext) => {
    gl.useProgram(this.programInfo.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.programInfo.VBO)
    gl.bindVertexArray(this.programInfo.VAO)

    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    gl.enable(gl.BLEND)

    gl.blendEquation(gl.FUNC_ADD)
  }
}
