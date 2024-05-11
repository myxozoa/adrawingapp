import { Application } from "@/managers/ApplicationManager"
import { RenderInfo } from "@/types"

type TResources = Map<string, RenderInfo>

class _ResourceManager {
  resources: TResources

  constructor() {
    this.resources = new Map()
  }

  create = (name: string, renderInfo: RenderInfo) => {
    this.resources.set(name, renderInfo)

    return renderInfo
  }

  delete = (name: string) => {
    const resource = this.resources.get(name)

    if (!resource) return

    // TODO: delete buffers as well
    for (const texture of resource.bufferInfo.textures) {
      Application.gl.deleteTexture(texture)
    }

    Application.gl.deleteFramebuffer(resource.bufferInfo?.framebuffer)
    Application.gl.deleteProgram(resource.programInfo?.program)

    this.resources.delete(name)
  }

  get = (name: string): RenderInfo => {
    const fetched = this.resources.get(name)

    if (!fetched) throw new Error("Resource not found")

    return fetched
  }
}

export const ResourceManager = new _ResourceManager()
