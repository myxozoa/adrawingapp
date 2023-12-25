import { tool_list } from "@/constants"
import { Tool, toolDefaults, toolProperties } from "@/objects/Tool"
import { ColorArray, EyeDropperSampleSizes, IEyedropper, IOperation } from "@/types"

import { useMainStore } from "@/stores/MainStore"
import { glPickPosition } from "@/utils"

export class Eyedropper extends Tool implements IEyedropper {
  settings: {
    sampleSize: EyeDropperSampleSizes
  }

  constructor(settings: Partial<IEyedropper["settings"]> = {}) {
    super()
    this.name = tool_list.EYEDROPPER

    this.settings = {} as IEyedropper["settings"]

    Object.assign(this, toolProperties.EYEDROPPER)
    Object.assign(this.settings, toolDefaults.EYEDROPPER)
    Object.assign(this.settings, settings)
  }

  init = () => {
    return
  }

  use = (gl: WebGL2RenderingContext, operation: IOperation) => {
    const { setColor } = useMainStore.getState()

    const point = operation.points[0]

    const { x, y } = glPickPosition(gl, point)

    const data = new Float32Array(4)

    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, data)

    const color = Array.from(data).map((value) => Math.max(Math.floor(value * 255)))

    setColor(color.slice(0, 3) as ColorArray)

    point.drawn = true
  }
}
