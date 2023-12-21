import { tool_list } from "@/constants"
import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { IFill } from "@/types"

export class Fill extends Tool implements IFill {
  flood: boolean

  constructor(settings: Partial<IFill>) {
    super()
    this.name = tool_list.FILL
    setWithDefaults.call(this, settings, toolDefaults.FILL)
  }
}
