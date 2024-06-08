import { Tool } from "@/objects/Tool"
import type { IBrush, IOperation, IPoint } from "@/types"

import { toolDefaults, toolProperties } from "@/stores/ToolStore"

import { useMainStore } from "@/stores/MainStore"

import { Point } from "@/objects/Point"

import brushFragment from "@/shaders/Brush/brush.frag"
import brushVertex from "@/shaders/Brush/brush.vert"

import {
  getDistance,
  calculatePointAlongDirection,
  cubicBezier,
  pressureInterpolation,
  maintainPointSpacing,
  calculateFromPressure,
  calculateCurveLength,
  calculateSpacing,
} from "@/utils/utils"

import * as glUtils from "@/utils/glUtils"
import { tool_list } from "@/constants"
import { Application } from "@/managers/ApplicationManager"
import { useLayerStore } from "@/stores/LayerStore"
import { scratchLayerBoundingBox, strokeFrameBoundingBox } from "@/managers/DrawingManager"
import { usePreferenceStore } from "@/stores/PreferenceStore"

export class Brush extends Tool implements IBrush {
  interpolationPoint: Point
  previouslyDrawnPoint: Point
  tempPoint: Point

  drawnPoints: Map<number, boolean>

  settings: {
    size: number
    sizePressure: boolean
    flow: number
    flowPressure: boolean
    opacity: number
    opacityPressure: boolean
    hardness: number
    hardnessPressure: boolean
    spacing: number
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

    this.interpolationPoint = new Point()
    this.previouslyDrawnPoint = new Point()
    this.tempPoint = new Point()

    this.drawnPoints = new Map()
  }

  private setupProgramAndAttributeUniforms = (gl: WebGL2RenderingContext) => {
    const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, brushFragment, true)
    const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, brushVertex, true)

    const program = glUtils.createProgram(gl, vertexShader, fragmentShader)

    const attributeNames = ["a_position"]

    const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)

    const uniformNames = ["u_point_random", "u_brush_color", "u_brush_qualities"]

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
      if (!this.drawnPoints.get(currentPoint.id)) {
        this.stamp(gl, currentPoint)

        this.drawnPoints.set(currentPoint.id, true)
        operation.addDrawnPoints(1)
      }
    } else if (currentPoint.active && prevPoint.active && !prevPrevPoint.active && !prevPrevPrevPoint.active) {
      if (!this.drawnPoints.get(currentPoint.id)) {
        this.line(gl, prevPoint, currentPoint)

        this.drawnPoints.set(currentPoint.id, true)
        operation.addDrawnPoints(2)
      }
    } else {
      if (
        currentPoint.active &&
        prevPoint.active &&
        prevPrevPoint.active &&
        prevPrevPrevPoint.active &&
        !this.drawnPoints.get(currentPoint.id) &&
        !this.drawnPoints.get(prevPoint.id) &&
        !this.drawnPoints.get(prevPrevPoint.id)
      ) {
        this.splineProcess(gl, operation)

        this.drawnPoints.set(currentPoint.id, true)
        this.drawnPoints.set(prevPoint.id, true)
        this.drawnPoints.set(prevPrevPoint.id, true)

        operation.addDrawnPoints(4)
      }
    }
  }

  /**
   * Process array of points as spline
   *
   * @param points length > 4
   */
  private splineProcess = (gl: WebGL2RenderingContext, operation: IOperation) => {
    const points = operation.points

    // Current Spline
    const start = points.getPoint(-4)
    const control = points.getPoint(-3)
    const control2 = points.getPoint(-2)
    const end = points.getPoint(-1)

    if (operation.drawnPoints > 4) {
      const prevControl2 = points.getPoint(-5)

      // Trying for c1 continuity
      control.x = start.x + (start.x - prevControl2.x)
      control.y = start.y + (start.y - prevControl2.y)
    }

    this.spline(gl, start, control, control2, end)
  }

  /**
   * Interpret the points as a bezier curve and stamp along it
   */
  private spline = (gl: WebGL2RenderingContext, start: IPoint, control: IPoint, control2: IPoint, end: IPoint) => {
    const size = calculateFromPressure(this.settings.size / 2, start.pressure, start.pointerType === "pen")

    const stampSpacing = calculateSpacing(this.settings.spacing, size)

    const estimatedArcLength = calculateCurveLength(start, control, control2, end)

    const steps = estimatedArcLength / stampSpacing

    // Stamp points along cubic bezier
    for (let t = 1 / steps, j = 0; t < 1; t += 1 / steps, j++) {
      this.interpolationPoint.x = cubicBezier(start.x, control.x, control2.x, end.x, t)
      this.interpolationPoint.y = cubicBezier(start.y, control.y, control2.y, end.y, t)

      this.interpolationPoint.pressure = pressureInterpolation(start, end, j / steps)
      this.interpolationPoint.pointerType = start.pointerType

      this.tempPoint.copy(this.interpolationPoint)

      let distance = getDistance(this.previouslyDrawnPoint, this.interpolationPoint)

      while (distance > stampSpacing) {
        maintainPointSpacing(this.previouslyDrawnPoint, this.tempPoint, distance, stampSpacing)

        this.stamp(gl, this.tempPoint)

        distance = getDistance(this.tempPoint, this.interpolationPoint)

        this.tempPoint.copy(this.interpolationPoint)
      }
    }
  }

  /**
   * Stamps along line between `start` and `end`
   */
  private line = (gl: WebGL2RenderingContext, start: IPoint, end: IPoint) => {
    const distance = getDistance(start, end)

    const usePressure = usePreferenceStore.getState().prefs.usePressure
    const basePressure = usePressure && start.pointerType === "pen"

    const size = calculateFromPressure(
      this.settings.size / 2,
      start.pressure,
      basePressure && this.settings.sizePressure,
    )

    const stampSpacing = calculateSpacing(this.settings.spacing, size)

    const steps = distance / stampSpacing

    // Stamp at evenly spaced intervals between the two points
    for (let t = 1 / steps, j = 0; t < 1; t += 1 / steps, j++) {
      const newPoint = calculatePointAlongDirection(start, end, t)

      this.interpolationPoint.x = newPoint.x
      this.interpolationPoint.y = newPoint.y
      this.interpolationPoint.pressure = pressureInterpolation(start, end, j / steps)
      this.interpolationPoint.pointerType = start.pointerType

      this.stamp(gl, this.interpolationPoint)
    }
  }

  /**
   * Moves quad around and draws it based on brush settings and point info
   */
  private stamp = (gl: WebGL2RenderingContext, point: IPoint) => {
    const usePressure = usePreferenceStore.getState().prefs.usePressure
    const currentLayerID = useLayerStore.getState().currentLayer
    const layerStorage = useLayerStore.getState().layerStorage
    const currentLayer = layerStorage.get(currentLayerID)!
    this.previouslyDrawnPoint.copy(point)

    const basePressure = usePressure && point.pointerType === "pen"

    const size = calculateFromPressure(
      this.settings.size / 2,
      point.pressure,
      basePressure && this.settings.sizePressure,
    )
    const flow = calculateFromPressure(
      this.settings.flow / 100,
      point.pressure,
      basePressure && this.settings.flowPressure,
    )
    const hardness = calculateFromPressure(
      this.settings.hardness / 100,
      point.pressure,
      basePressure && this.settings.hardnessPressure,
    )

    const base_roughness = 2

    const roughness = calculateFromPressure(base_roughness, point.pressure, false)

    const startScissorX = point.x - size
    const startScissorY = Application.canvasInfo.height - size - point.y

    const scissorWidth = size * 2 + 4
    const scissorHeight = size * 2 + 4

    // Internals
    gl.scissor(startScissorX, startScissorY, scissorWidth, scissorHeight)

    scratchLayerBoundingBox.calculate(startScissorX, startScissorY, scissorWidth, scissorHeight)
    strokeFrameBoundingBox.calculate(startScissorX, startScissorY, scissorWidth, scissorHeight)
    currentLayer.calculateNewBoundingBox(startScissorX, startScissorY, scissorWidth, scissorHeight)

    gl.uniform4f(this.programInfo.uniforms.u_brush_qualities, flow, hardness, base_roughness - roughness, size)

    gl.uniform3f(
      this.programInfo.uniforms.u_point_random,
      point.x,
      Application.canvasInfo.height - point.y,
      Math.random(),
    )

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

    gl.uniform3f(this.programInfo.uniforms.u_brush_color, color[0] / 255, color[1] / 255, color[2] / 255)

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

    // gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    gl.enable(gl.BLEND)

    gl.blendEquation(gl.FUNC_ADD)
  }

  public end = () => {
    this.previouslyDrawnPoint.reset()

    this.interpolationPoint.reset()

    this.drawnPoints.clear()
  }

  public reset = () => {
    Object.assign(this, toolProperties.BRUSH)
    Object.assign(this.settings, toolDefaults.BRUSH)
    this.end()
  }
}
