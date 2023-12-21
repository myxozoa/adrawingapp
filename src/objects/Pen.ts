import { tool_list } from "@/constants"
import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { IPen } from "@/types"

export class Pen extends Tool implements IPen {
  size: number
  opacity: number

  constructor(settings: Partial<IPen>) {
    super()
    this.name = tool_list.PEN
    setWithDefaults.call(this, settings, toolDefaults.PEN)
  }
}
