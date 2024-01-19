import * as glUtils from "@/glUtils.ts"

import rtFragment from "@/shaders/TransparencyGrid/transparencyGrid.frag?raw"
import rtVertex from "@/shaders/TransparencyGrid/transparencyGrid.vert?raw"

import { DrawingManager } from "@/managers/drawingManager"

class _TransparencyGrid {
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
    this.renderBufferInfo = {} as unknown as typeof this.renderBufferInfo
    this.renderProgramInfo = {} as unknown as typeof this.renderProgramInfo
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
      DrawingManager.glInfo.supportedImageFormat,
      width,
      height,
      0,
      gl.RGBA,
      DrawingManager.glInfo.supportedType,
      new Float32Array(width * height * 4).fill(1),
    )

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, DrawingManager.glInfo.supportedFilterType)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, DrawingManager.glInfo.supportedFilterType)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Unbind
    gl.bindTexture(gl.TEXTURE_2D, null)

    return texture
  }

  private setupRenderTextureProgramAndAttributes = (gl: WebGL2RenderingContext) => {
    const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, rtFragment)
    const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, rtVertex)

    const program = glUtils.createProgram(gl, vertexShader, fragmentShader)

    const attributeNames = ["a_position", "a_tex_coord"]

    const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)

    return { attributes, program }
  }

  /**
   * @throws If unable to create vertex buffer
   */
  private setupRenderTextureVBO = (gl: WebGL2RenderingContext) => {
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

  public init = (gl: WebGL2RenderingContext) => {
    const targetTextureWidth = gl.canvas.width
    const targetTextureHeight = gl.canvas.height

    const { program, attributes } = this.setupRenderTextureProgramAndAttributes(gl)
    this.renderProgramInfo.program = program

    this.renderBufferInfo.targetTexture = this.createRenderTexture(gl, targetTextureWidth, targetTextureHeight)
    gl.bindTexture(gl.TEXTURE_2D, this.renderBufferInfo.targetTexture)

    this.renderBufferInfo.framebuffer = this.setupRenderTextureFramebuffer(gl, this.renderBufferInfo.targetTexture)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderBufferInfo.framebuffer)

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

  /**
   * Draw render buffer texture to the canvas draw buffer
   */
  public renderToScreen = (gl: WebGL2RenderingContext) => {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    // this.clear()

    gl.useProgram(this.renderProgramInfo.program)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, this.renderBufferInfo.targetTexture)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.renderProgramInfo.VBO)
    gl.bindVertexArray(this.renderProgramInfo.VAO)

    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)
    gl.blendEquation(gl.FUNC_ADD)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    gl.flush()

    // Unbind
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindVertexArray(null)
  }
}

export const TransparencyGrid = new _TransparencyGrid()
