import { tool_list } from "@/constants"
import { Tool, toolDefaults, toolProperties } from "@/objects/Tool"
import { ColorArray, EyeDropperSampleSizes, IEyedropper, IOperation } from "@/types"

import { useMainStore } from "@/stores/MainStore"

import { readPixelsAsync } from "@/utils/asyncReadback"

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

  /** @override */
  init = () => {
    return
  }

  /**
   * Will asyncronously read pixel(s) from the the current layer or main render texture and set the value from it/them to the current color
   *
   * @param operation Will use the first/ideally only point
   */
  // TODO: Implement multiple pixel sampling/averaging
  use = async (gl: WebGL2RenderingContext, operation: IOperation) => {
    const { setColor } = useMainStore.getState()

    const point = operation.points.list[0]

    const { x, y } = glPickPosition(gl, point)

    const data = new Float32Array(4)

    const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
    const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) as number

    await readPixelsAsync(gl, x, y, 1, 1, format, type, data)

    // TODO: This is currently assuming 8bit color
    const color = Array.from(data).map((value) => Math.min(Math.floor(value * 255), 255))

    console.log(color)

    setColor(color.slice(0, 3) as ColorArray)
  }
}
