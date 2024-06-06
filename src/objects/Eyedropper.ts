import { tool_list } from "@/constants"
import { Tool } from "@/objects/Tool"
import type { ColorArray, EyeDropperSampleSizes, IEyedropper, IOperation } from "@/types"

import { useMainStore } from "@/stores/MainStore"

import { readPixelsAsync } from "@/utils/asyncReadback"

import { linearTosRGB } from "@/utils/colors"
import { uint16ToFloat16 } from "@/utils/utils"
import { Application } from "@/managers/ApplicationManager"
import { toolDefaults, toolProperties } from "@/stores/ToolStore"

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
    const setColor = useMainStore.getState().setColor

    const point = operation.points.list[0]

    const data = new Uint16Array(4)

    const format = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_FORMAT) as number
    const type = gl.getParameter(gl.IMPLEMENTATION_COLOR_READ_TYPE) as number

    await readPixelsAsync(gl, point.x, Application.canvasInfo.height - point.y, 1, 1, format, type, data)

    const color = Array.from(data, (num) => {
      return linearTosRGB(uint16ToFloat16(num))
    })

    const unPremultipliedColor = color.map((num) => {
      return Math.floor((num / color[3]) * 255) || 0
    })

    setColor(unPremultipliedColor.slice(0, 3) as ColorArray)
  }
}
