import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { IBrush } from "@/types"

export class Brush extends Tool implements IBrush {
  size: number
  opacity: number
  hardness: number
  spacing: number

  constructor(settings: Partial<IBrush>) {
    super()
    setWithDefaults.call(this, settings, toolDefaults.BRUSH)
  }
}