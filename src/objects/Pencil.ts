import { tool_list } from "@/constants"
import { Brush } from "@/objects/Brush"
import { Tool } from "@/objects/Tool"
import type { IBrush, IOperation, IPencil } from "@/types"

import { toolDefaults, toolProperties } from "@/stores/ToolStore"

// The pencil behaves almost exactly like the brush aside from having b/w hard edges
// so this passthrough thing is what im going with for the time being
export class Pencil extends Tool {
  settings: {
    size: number
    sizePressure: boolean
    flow: number
    flowPressure: boolean
    opacity: number
    opacityPressure: boolean
    hardness: number
    hardnessPressure: boolean
    spacing: number
  }
  brush: Brush

  constructor(settings: Partial<IBrush["settings"]> = {}) {
    super()
    this.name = tool_list.PENCIL
    const brush = new Brush({ ...toolDefaults.PENCIL, ...settings })
    this.brush = brush

    // Hack to get settings synced to the brush...could be worse
    const intercept: ProxyHandler<IPencil["settings"]> = {
      set(target: IPencil["settings"], p: string | symbol, newValue: any) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        target[p] = newValue

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        brush.settings[p] = newValue

        return true
      },
    }

    this.settings = new Proxy({} as IPencil["settings"], intercept)

    Object.assign(this, toolProperties.PENCIL)
    Object.assign(this.settings, toolDefaults.PENCIL)
    Object.assign(this.settings, settings)
  }

  /** @override */
  base = () => {
    return
  }

  /** Initialize necessary WebGL resources
   *
   *  Should be called once
   *
   * @override
   */
  init = (gl: WebGL2RenderingContext) => {
    this.brush.init(gl)
  }

  /** @override */
  draw = (gl: WebGL2RenderingContext, operation: IOperation) => {
    this.brush.draw(gl, operation)
  }

  /** @override */
  switchTo = (gl: WebGL2RenderingContext) => {
    this.brush.switchTo(gl)

    gl.uniform1i(this.brush.programInfo.uniforms.u_pencil, 1)
  }

  reset = () => {
    this.brush.reset()

    Object.assign(this, toolProperties.PENCIL)
    Object.assign(this.settings, toolDefaults.PENCIL)
  }
}
