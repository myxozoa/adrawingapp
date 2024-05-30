import fragment from "@/shaders/Background/background.frag"
import vertex from "@/shaders/Background/background.vert"

import { setupFullscreenVBO, createVAO, setupProgramAttributesUniforms } from "@/utils/glUtils"
import type { RenderInfo } from "@/types"

export function createFullscreenQuad(gl: WebGL2RenderingContext) {
  const renderInfo: RenderInfo = {
    bufferInfo: {
      framebuffer: null,
      textures: [],
    },
    programInfo: { program: null, uniforms: {}, attributes: {}, VBO: null, VAO: null },
  }

  const { program, attributes, uniforms } = setupProgramAttributesUniforms(gl, fragment, vertex, ["a_position"], [])
  renderInfo.programInfo.program = program
  renderInfo.programInfo.uniforms = uniforms
  renderInfo.programInfo.attributes = attributes

  renderInfo.programInfo.VBO = setupFullscreenVBO(gl)
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
