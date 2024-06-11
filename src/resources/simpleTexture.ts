import { createTexture, createFramebuffer } from "@/utils/glUtils"
import type { RenderInfo } from "@/types"
import { Application } from "@/managers/ApplicationManager"

// Depending on DrawingManager for feature support info when thats
// currently determined in the same place this is called isnt great
export function createSimpleTexture(gl: WebGL2RenderingContext, width: number, height: number, mipMap: boolean) {
  const renderInfo: RenderInfo = {
    bufferInfo: {
      framebuffer: null,
      textures: [],
    },
    programInfo: { program: null, uniforms: {}, attributes: {}, VBO: null, VAO: null },
    data: {},
  }

  renderInfo.bufferInfo.textures[0] = createTexture(
    gl,
    width,
    height,
    Application.textureSupport.imageFormat,
    mipMap,
    Application.textureSupport.minFilterType,
    Application.textureSupport.magFilterType,
  )
  renderInfo.bufferInfo.framebuffer = createFramebuffer(gl, renderInfo.bufferInfo.textures)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  return renderInfo
}
