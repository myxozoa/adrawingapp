import {
  createFramebuffer,
  createTexture,
  createVAO,
  setupFullCanvasVBO,
  setupProgramAttributesUniforms,
} from "@/utils/glUtils"
import type { RenderInfo } from "@/types"
import { mat3 } from "gl-matrix"
import { Application } from "@/managers/ApplicationManager"

// Depending on DrawingManager for feature support info when thats
// currently determined in the same place this is called isnt great
export function createCanvasRenderTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  fragment: string,
  vertex: string,
  mipMap: boolean,
  additionalUniforms: string[] = [],
  numTextures = 1,
  force16bit = false,
) {
  const renderInfo: RenderInfo = {
    bufferInfo: {
      framebuffer: null,
      textures: [],
    },
    programInfo: { program: null, uniforms: {}, attributes: {}, VBO: null, VAO: null },
    data: {
      matrix: mat3.create(),
    },
  }

  for (let i = 0; i <= numTextures; i++) {
    renderInfo.bufferInfo.textures[i] = createTexture(
      gl,
      width,
      height,
      force16bit ? gl.RGBA16F : Application.textureSupport.imageFormat,
      mipMap,
      Application.textureSupport.minFilterType,
      Application.textureSupport.magFilterType,
    )
  }

  renderInfo.bufferInfo.framebuffer = createFramebuffer(gl, renderInfo.bufferInfo.textures)
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderInfo.bufferInfo.framebuffer)

  const { program, attributes, uniforms } = setupProgramAttributesUniforms(
    gl,
    fragment,
    vertex,
    ["a_position"],
    ["u_matrix", "u_size", ...additionalUniforms],
  )
  renderInfo.programInfo.program = program
  renderInfo.programInfo.uniforms = uniforms
  renderInfo.programInfo.attributes = attributes

  renderInfo.programInfo.VBO = setupFullCanvasVBO(gl, width, height)
  gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo.VBO)

  renderInfo.programInfo.VAO = createVAO(gl, attributes.a_position)
  gl.bindVertexArray(renderInfo.programInfo.VAO)

  gl.vertexAttribPointer(attributes.a_position, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attributes.a_position)

  gl.useProgram(program)
  gl.uniform2f(uniforms.u_size, width, height)

  // Unbind
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindVertexArray(null)
  gl.useProgram(null)

  return renderInfo
}
