import fragment from "@/shaders/Background/background.frag?raw"
import vertex from "@/shaders/Background/background.vert?raw"

import { createBuffer, createVAO, setupProgramAttributesUniforms } from "@/glUtils.ts"
import { RenderInfo } from "@/types"

export function createFullscreenQuad(gl: WebGL2RenderingContext) {
  const renderInfo: RenderInfo = {
    bufferInfo: {
      framebuffer: null,
      texture: null,
    },
    programInfo: { program: null, uniforms: {}, attributes: {}, VBO: null, VAO: null },
  }

  const { program, attributes, uniforms } = setupProgramAttributesUniforms(gl, fragment, vertex, ["a_position"], [])
  renderInfo.programInfo.program = program
  renderInfo.programInfo.uniforms = uniforms
  renderInfo.programInfo.attributes = attributes

  gl.vertexAttribPointer(attributes.a_tex_coord, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attributes.a_tex_coord)

  renderInfo.programInfo.VBO = FullscreenQuad.setupVBO(gl)
  gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo.VBO)

  renderInfo.programInfo.VAO = createVAO(gl, attributes.a_position)
  gl.bindVertexArray(renderInfo.programInfo.VAO)

  // Unbind
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindVertexArray(null)

  return renderInfo
}

function setupVBO(gl: WebGL2RenderingContext) {
  const positions = new Float32Array([
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
  ])

  return createBuffer(gl, positions)
}

export const FullscreenQuad = {
  setupVBO,
}
