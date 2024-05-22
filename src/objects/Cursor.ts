import cursorFragment from "@/shaders/Cursor/cursor.frag"
import cursorVertex from "@/shaders/Cursor/cursor.vert"

import * as glUtils from "@/utils/glUtils"
import { useToolStore } from "@/stores/ToolStore"
import { Camera } from "@/objects/Camera"
import { mat3, vec2 } from "gl-matrix"

import { CanvasSizeCache } from "@/utils/utils"

export class _Cursor {
  programInfo: {
    program: WebGLProgram
    uniforms: Record<string, WebGLUniformLocation>
    attributes: Record<string, GLint>
    VBO: WebGLBuffer
    VAO: WebGLBuffer
  }

  matrix: mat3
  location: vec2
  size: vec2

  constructor() {
    this.programInfo = {} as unknown as typeof this.programInfo

    this.matrix = mat3.create()
    this.location = vec2.create()
    this.size = vec2.create()
  }

  private setupProgramAndAttributeUniforms = (gl: WebGL2RenderingContext) => {
    const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, cursorFragment)
    const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, cursorVertex)

    const program = glUtils.createProgram(gl, vertexShader, fragmentShader)

    const attributeNames = ["a_position"]

    const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)

    const uniformNames = ["u_point_size", "u_matrix"]

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

  /**
   * Moves quad around and draws it based on brush settings and point info
   */
  public draw = (gl: WebGL2RenderingContext, point: { x: number; y: number }) => {
    gl.useProgram(this.programInfo.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.programInfo.VBO)
    gl.bindVertexArray(this.programInfo.VAO)

    const size = Math.max(
      // @ts-expect-error TODO: Fix this
      ((useToolStore.getState().currentTool.settings.size as number | undefined) ||
        // @ts-expect-error TODO: Fix this
        (useToolStore.getState().currentTool.settings.sampleSize as number | undefined) ||
        10) / 2,
      3,
    )

    gl.uniform3f(this.programInfo.uniforms.u_point_size, point.x, CanvasSizeCache.height - point.y, size)

    this.location[0] = point.x
    this.location[1] = point.y

    this.size[0] = size
    this.size[1] = size

    mat3.fromTranslation(this.matrix, this.location)
    mat3.scale(this.matrix, this.matrix, this.size)

    gl.uniformMatrix3fv(this.programInfo.uniforms.u_matrix, false, Camera.project(this.matrix))

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
}

export const Cursor = new _Cursor()
