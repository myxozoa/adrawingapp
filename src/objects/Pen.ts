import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { IPen } from "@/types"

export class Pen extends Tool implements IPen {
  size: number
  opacity: number

  constructor(settings: Partial<IPen>) {
    super()
    setWithDefaults.call(this, settings, toolDefaults.PEN)
  }
}