import { tool_list } from "@/constants"
import { Tool } from "@/objects/Tool"
import { useMainStore } from "@/stores/MainStore"
import type { IFill } from "@/types"
import { toolDefaults, toolProperties } from "@/stores/ToolStore"
import { Application } from "@/managers/ApplicationManager"
import { useLayerStore } from "@/stores/LayerStore"
import { scratchLayerBoundingBox, strokeFrameBoundingBox } from "@/managers/DrawingManager"
export class Fill extends Tool implements IFill {
  settings: {
    flood: boolean
  }

  constructor(settings: Partial<IFill["settings"]> = {}) {
    super()
    this.name = tool_list.FILL

    this.settings = {} as IFill["settings"]

    Object.assign(this, toolProperties.FILL)
    Object.assign(this.settings, toolDefaults.FILL)
    Object.assign(this.settings, settings)
  }

  /** @override */
  init = () => {
    return
  }

  /**
   * Currently this fills the current layer / render texture with the current color
   *
   */
  // TODO: Implement flood fill
  use = (gl: WebGL2RenderingContext) => {
    const color = useMainStore.getState().color
    const currentLayerID = useLayerStore.getState().currentLayer
    const layerStorage = useLayerStore.getState().layerStorage

    const currentLayer = layerStorage.get(currentLayerID)!

    scratchLayerBoundingBox.calculate(0, 0, Application.canvasInfo.width, Application.canvasInfo.height)
    strokeFrameBoundingBox.calculate(0, 0, Application.canvasInfo.width, Application.canvasInfo.height)
    currentLayer.calculateNewBoundingBox(0, 0, Application.canvasInfo.width, Application.canvasInfo.height)

    // TODO: this is currently assuming 8bit color
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([...color.map((value) => value / 255), 1]))
  }

  reset = () => {
    Object.assign(this, toolProperties.FILL)
    Object.assign(this.settings, toolDefaults.FILL)
  }
}
