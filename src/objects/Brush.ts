import { Tool, toolDefaults, toolProperties } from "@/objects/Tool"
import { IBrush, IOperation, IPoint, IPoints } from "@/types"

import { useMainStore } from "@/stores/MainStore"
import { usePreferenceStore } from "@/stores/PreferenceStore"

import { Point } from "@/objects/Point"

import brushFragment from "@/shaders/Brush/brush.frag?raw"
import brushVertex from "@/shaders/Brush/brush.vert?raw"

import { getDistance, lerp, newPointAlongDirection, cubicBezier, pressureInterpolation } from "@/utils"

import { mat4, vec3 } from "gl-matrix"

import * as glUtils from "@/glUtils"
import { tool_list } from "@/constants"

const baseSize = 100

const drawnPoints: Record<string, boolean> = {}

export class Brush extends Tool implements IBrush {
  interpolationPoint: IPoint
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
    sizeVector: vec3
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

    this.glInfo.sizeVector = vec3.fromValues(1, 1, 1)

    this.interpolationPoint = new Point()
  }

  private setupProgramAndAttributeUniforms = (gl: WebGL2RenderingContext) => {
    const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, brushFragment)
    const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, brushVertex)

    const program = glUtils.createProgram(gl, vertexShader, fragmentShader)

    const attributeNames = ["a_position"]

    const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)

    const uniformNames = ["u_matrix", "u_point", "u_resolution", "u_brush_color", "u_softness", "u_flow", "u_random"]

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
    const prevPrevPrevPoint = operation.points.getPoint(-4)
    const prevPrevPoint = operation.points.getPoint(-3)
    const prevPoint = operation.points.getPoint(-2)
    const currentPoint = operation.points.getPoint(-1)

    if (currentPoint.active && !prevPoint.active && !prevPrevPoint.active && !prevPrevPrevPoint.active) {
      if (!drawnPoints[vec3.str(currentPoint.location)]) {
        this.stamp(gl, currentPoint)
        drawnPoints[vec3.str(currentPoint.location)] = true
      }
    } else if (prevPoint.active && !prevPrevPoint.active && !prevPrevPrevPoint.active) {
      if (!drawnPoints[vec3.str(currentPoint.location)]) {
        this.line(gl, prevPoint, currentPoint)
        drawnPoints[vec3.str(currentPoint.location)] = true
      }
    } else {
      if (
        !drawnPoints[vec3.str(currentPoint.location)] &&
        !drawnPoints[vec3.str(prevPoint.location)] &&
        !drawnPoints[vec3.str(prevPrevPoint.location)] &&
        currentPoint.active &&
        prevPoint.active &&
        prevPrevPoint.active &&
        prevPrevPrevPoint.active
      ) {
        this.splineProcess(gl, operation.points)

        drawnPoints[vec3.str(currentPoint.location)] = true
        drawnPoints[vec3.str(prevPoint.location)] = true
        drawnPoints[vec3.str(prevPrevPoint.location)] = true
        drawnPoints[vec3.str(prevPrevPrevPoint.location)] = true
      }
    }
  }

  /**
   * Process array of points as spline
   *
   * @param points length > 4
   */
  private splineProcess = (gl: WebGL2RenderingContext, points: IPoints) => {
    const start = points.getPoint(-4)!
    const control = points.getPoint(-3)!
    const control2 = points.getPoint(-2)!
    const end = points.getPoint(-1)!

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
      const x = cubicBezier(start.x, control.x, control2.x, end.x, t)
      const y = cubicBezier(start.y, control.y, control2.y, end.y, t)
      const pressure = pressureInterpolation(start, control, control2, end, t, j / steps)

      this.interpolationPoint.x = x
      this.interpolationPoint.y = y
      this.interpolationPoint.pressure = pressure
      this.interpolationPoint.pointerType = start.pointerType

      this.stamp(gl, this.interpolationPoint)
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

      this.interpolationPoint.x = x
      this.interpolationPoint.y = y
      this.interpolationPoint.pressure = lerp(start.pressure, end.pressure, j / steps)
      this.interpolationPoint.pointerType = start.pointerType

      this.stamp(gl, this.interpolationPoint)
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

    this.glInfo.sizeVector[0] = this.settings.size

    if (point.pointerType === "pen") {
      this.glInfo.sizeVector[0] -= (1 - Math.pow(point.pressure, prefs.pressureSensitivity)) * this.glInfo.sizeVector[0]
    }

    this.glInfo.sizeVector[1] = this.glInfo.sizeVector[0]
    this.glInfo.sizeVector[2] = this.glInfo.sizeVector[0]

    // Internals
    mat4.scale(this.glInfo.matrix, this.glInfo.matrix, this.glInfo.sizeVector)
    gl.uniform2f(this.programInfo.uniforms.u_resolution, this.glInfo.sizeVector[0], this.glInfo.sizeVector[0])

    gl.uniformMatrix4fv(this.programInfo.uniforms.u_matrix, true, this.glInfo.matrix)
    gl.uniform2f(this.programInfo.uniforms.u_point, point.x, gl.canvas.height - point.y)

    // gl.uniform1f(this.programInfo.uniforms.u_random, Math.random())

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
    if (!operation.readyToDraw) return

    const color = useMainStore.getState().color

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
