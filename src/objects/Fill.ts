import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { IFill } from "@/types"

export class Fill extends Tool implements IFill {
  flood: boolean

  constructor(settings: Partial<IFill>) {
    super()
    setWithDefaults.call(this, settings, toolDefaults.FILL)
  }
}