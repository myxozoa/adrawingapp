import fragment from "@/shaders/TransparencyGrid/transparencyGrid.frag"
import vertex from "@/shaders/TransparencyGrid/transparencyGrid.vert"

import { setupFullCanvasVBO, createVAO, setupProgramAttributesUniforms } from "@/utils/glUtils"
import type { RenderInfo } from "@/types"
import { mat3, vec2 } from "gl-matrix"

export function createTransparencyGrid(gl: WebGL2RenderingContext, width: number, height: number) {
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

  mat3.translate(renderInfo.data!.matrix!, renderInfo.data!.matrix!, vec2.fromValues(0, 0))

  const { program, attributes, uniforms } = setupProgramAttributesUniforms(
    gl,
    fragment,
    vertex,
    ["a_position"],
    ["u_matrix", "u_size"],
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

  // Unbind
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindVertexArray(null)

  return renderInfo
}
