import { Application } from "@/managers/ApplicationManager"
import { RenderInfo } from "@/types"

type TResources = Record<string, RenderInfo>

class _ResourceManager {
  resources: TResources

  constructor() {
    this.resources = {} as TResources
  }

  create = (name: keyof typeof this.resources, renderInfo: RenderInfo) => {
    this.resources[name] = renderInfo

    return renderInfo
  }

  delete = (name: keyof typeof this.resources) => {
    const resource = this.resources[name]

    // TODO: delete buffers as well
    Application.gl.deleteTexture(resource.bufferInfo?.texture)

    Application.gl.deleteFramebuffer(resource.bufferInfo?.framebuffer)
    Application.gl.deleteProgram(resource.programInfo?.program)

    delete this.resources[name]
  }

  get = (name: keyof typeof this.resources) => {
    return this.resources[name]
  }
}

export const ResourceManager = new _ResourceManager()
