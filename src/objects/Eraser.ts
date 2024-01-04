import { tool_list } from "@/constants"
import { Brush } from "@/objects/Brush"
import { Tool, toolDefaults, toolProperties } from "@/objects/Tool"
import { IBrush, IOperation, IEraser } from "@/types"

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
    this.brush = new Brush({ ...toolDefaults.ERASER, ...settings })

    this.settings = {} as IEraser["settings"]

    Object.assign(this, toolProperties.ERASER)
    Object.assign(this.settings, toolDefaults.ERASER)
    Object.assign(this.settings, settings)
  }

  base = () => {
    return
  }

  init = (gl: WebGL2RenderingContext) => {
    this.brush.init(gl)
  }

  switchTo = (gl: WebGL2RenderingContext) => {
    this.brush.switchTo(gl)

    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT)
  }

  draw = (gl: WebGL2RenderingContext, operation: IOperation) => {
    this.brush.base(gl, operation)
  }
}
