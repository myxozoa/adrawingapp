import { createBuffer, createFramebuffer, createTexture, createVAO, setupProgramAttributesUniforms } from "@/glUtils.ts"
import { RenderInfo } from "@/types"
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
      Application.textureSupport.imageFormat,
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
    ["a_position", "a_tex_coord"],
    ["u_matrix", ...additionalUniforms],
  )
  renderInfo.programInfo.program = program
  renderInfo.programInfo.uniforms = uniforms
  renderInfo.programInfo.attributes = attributes

  renderInfo.programInfo.VBO = setupVBO(gl, width, height)
  gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo.VBO)

  renderInfo.programInfo.VAO = createVAO(gl, attributes.a_position)
  gl.bindVertexArray(renderInfo.programInfo.VAO)

  gl.vertexAttribPointer(attributes.a_position, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attributes.a_position)

  const uvBuffer = setupUVBuffer(gl)
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
  gl.vertexAttribPointer(attributes.a_tex_coord, 2, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(attributes.a_tex_coord)

  // Unbind
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindTexture(gl.TEXTURE_2D, null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.bindVertexArray(null)

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
