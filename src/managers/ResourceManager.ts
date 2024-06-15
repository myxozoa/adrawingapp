import { Application } from "@/managers/ApplicationManager"
import type { RenderInfo } from "@/types"

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

    Application.gl.bindTexture(Application.gl.TEXTURE_2D, null)

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

    if (!fetched) throw new Error(`Resource ${name} not found`)

    return fetched
  }

  deleteAll = () => {
    for (const resource of this.resources) {
      this.delete(resource[0])
    }
  }
}

export const ResourceManager = new _ResourceManager()
