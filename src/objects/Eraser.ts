import { tool_list } from "@/constants"
import { Brush } from "@/objects/Brush"
import { Tool, toolDefaults, toolProperties } from "@/objects/Tool"
import type { IBrush, IOperation, IEraser } from "@/types"

// The Eraser behaves almost exactly like the brush aside from the differing blend states
// so this passthrough thing is what im going with for the time being
export class Eraser extends Tool {
  settings: {
    size: number
    flow: number
    opacity: number
    hardness: number
    spacing: number
  }
  brush: IBrush

  constructor(settings: Partial<IBrush["settings"]> = {}) {
    super()
    this.name = tool_list.ERASER
    const brush = new Brush({ ...toolDefaults.ERASER, ...settings })
    this.brush = brush

    // Hack to get settings synced to the brush...could be worse
    const intercept: ProxyHandler<IEraser["settings"]> = {
      set(target: IEraser["settings"], p: string | symbol, newValue: any) {
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

    this.settings = new Proxy({} as IEraser["settings"], intercept)

    Object.assign(this, toolProperties.ERASER)
    Object.assign(this.settings, toolDefaults.ERASER)
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
  }
}
