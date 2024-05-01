import fragment from "@/shaders/TransparencyGrid/transparencyGrid.frag?raw"
import vertex from "@/shaders/TransparencyGrid/transparencyGrid.vert?raw"

import { createBuffer, createVAO, setupProgramAttributesUniforms } from "@/glUtils.ts"
import { ProgramInfo, RenderInfo } from "@/types"
import { mat3, vec2 } from "gl-matrix"

export function createTransparencyGrid(gl: WebGL2RenderingContext, width: number, height: number) {
  const renderInfo: RenderInfo = {
    bufferInfo: {
      framebuffer: null,
      texture: null,
    },
    programInfo: {} as ProgramInfo,
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

  gl.vertexAttribPointer(attributes.a_tex_coord, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attributes.a_tex_coord)

  renderInfo.programInfo.VBO = setupVBO(gl, width, height)
  gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo.VBO)

  renderInfo.programInfo.VAO = createVAO(gl, attributes.a_position)
  gl.bindVertexArray(renderInfo.programInfo.VAO)

  // Unbind
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindVertexArray(null)

  return renderInfo
}

function setupVBO(gl: WebGL2RenderingContext, width: number, height: number) {
  const positions = new Float32Array([
    // Triangle 1
    0.0,
    0.0, // Top left
    0.0,
    height, // Bottom left
    width,
    0.0, // Top right

    // Triangle 2
    0.0,
    height, // Bottom left
    width,
    height, // Bottom right
    width,
    0.0, // Top right
  ])

  return createBuffer(gl, positions)
}
