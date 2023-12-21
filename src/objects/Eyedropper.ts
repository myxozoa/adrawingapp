import { tool_list } from "@/constants"
import { Tool, toolDefaults, setWithDefaults } from "@/objects/Tool"
import { ColorArray, EyeDropperSampleSizes, IEyedropper, IOperation } from "@/types"

import { useMainStore } from "@/stores/MainStore"

export class Eyedropper extends Tool implements IEyedropper {
  sampleSize: EyeDropperSampleSizes

  constructor(settings: Partial<IEyedropper> = {}) {
    super()
    this.name = tool_list.EYEDROPPER
    setWithDefaults.call(this, settings, toolDefaults.EYEDROPPER)
  }

  init = () => {
    return
  }

  use = (gl: WebGL2RenderingContext, operation: IOperation) => {
    const { setColor } = useMainStore.getState()

    const point = operation.points[0]
    const rect = (gl.canvas as HTMLCanvasElement).getBoundingClientRect()

    const pickX = point.x
    const pickY = rect.bottom - rect.top - point.y - 1

    const data = new Float32Array(4)

    gl.readPixels(pickX, pickY, 1, 1, gl.RGBA, gl.FLOAT, data)

    const color = Array.from(data).map((value) => Math.max(Math.floor(value * 255)))

    setColor(color.slice(0, 3) as ColorArray)

    point.drawn = true
  }
}
