import { tool_list } from "@/constants"
import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { useMainStore } from "@/stores/MainStore"
import { IFill } from "@/types"

export class Fill extends Tool implements IFill {
  flood: boolean

  constructor(settings: Partial<IFill> = {}) {
    super()
    this.name = tool_list.FILL
    setWithDefaults.call(this, settings, toolDefaults.FILL)
  }

  init = () => {
    return
  }

  use = (gl: WebGL2RenderingContext) => {
    const color = useMainStore.getState().color

    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([...color.map((value) => value / 255), 1]))
  }
}
