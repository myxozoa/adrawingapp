import { RenderInfo } from "@/types"

type Resources = "CanvasRenderTexture" | "TransparencyGrid" | "Background"

type TResources = Record<Resources, RenderInfo>

class _ResourceManager {
  resources: TResources

  constructor() {
    this.resources = {} as TResources
  }

  create = (name: keyof typeof this.resources, renderInfo: RenderInfo) => {
    this.resources[name] = renderInfo
  }

  delete = (name: keyof typeof this.resources) => {
    delete this.resources[name]
  }

  get = (name: keyof typeof this.resources) => {
    return this.resources[name]
  }
}

export const ResourceManager = new _ResourceManager()
