import fragment from "@/shaders/Scratch/scratch.frag?raw"
import vertex from "@/shaders/Scratch/scratch.vert?raw"

import { setupProgramAttributesUniforms, createBuffer, createVAO } from "@/glUtils"
import { ProgramInfo, RenderInfo } from "@/types"

export function createLayerProgram(gl: WebGL2RenderingContext, width: number, height: number) {
  const renderInfo: RenderInfo = {
    bufferInfo: {
      framebuffer: null,
      texture: null,
    },
    programInfo: {} as ProgramInfo,
  }

  const { uniforms, program, attributes } = setupProgramAttributesUniforms(
    gl,
    fragment,
    vertex,
    ["a_position", "a_tex_coord"],
    ["u_matrix", "u_source_texture", "u_destination_texture"],
  )

  renderInfo.programInfo.uniforms = uniforms
  renderInfo.programInfo.program = program
  renderInfo.programInfo.attributes = attributes

  renderInfo.programInfo.VBO = setupVBO(gl, width, height)
  gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo.VBO)

  renderInfo.programInfo.VAO = createVAO(gl, attributes.a_position)
  gl.bindVertexArray(renderInfo.programInfo.VAO)

  const uvBuffer = setupUVBuffer(gl)
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)

  gl.vertexAttribPointer(attributes.a_tex_coord, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attributes.a_tex_coord)

  // Unbind
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindVertexArray(null)

  gl.useProgram(program)
  gl.uniform1i(uniforms.u_source_texture, 0)
  gl.uniform1i(uniforms.u_destination_texture, 1)

  gl.useProgram(null)

  return renderInfo
}

function setupUVBuffer(gl: WebGL2RenderingContext) {
  const textureCoordinates = new Float32Array([
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
  ])

  return createBuffer(gl, textureCoordinates)
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
