import { tool_list } from "@/constants"
import { Tool, toolDefaults, toolProperties } from "@/objects/Tool"
import { useMainStore } from "@/stores/MainStore"
import { IFill } from "@/types"

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

    // TODO: this is currently assuming 8bit color
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([...color.map((value) => value / 255), 1]))
  }
}
