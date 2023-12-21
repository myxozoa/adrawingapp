import { tool_list } from "@/constants"
import { Brush } from "@/objects/Brush"
import { Tool, toolDefaults } from "@/objects/Tool"
import { IBrush, IOperation, IEraser } from "@/types"

import { setWithDefaults } from "@/objects/Tool"

// The Eraser behaves almost exactly like the brush aside from the differing blend states
// so this passthrough thing is what im going with for the time being
export class Eraser extends Tool {
  brush: IBrush

  constructor(settings: Partial<IBrush> = {}) {
    super()
    this.name = tool_list.ERASER
    this.brush = new Brush({ ...toolDefaults.ERASER, ...settings })

    const set = setWithDefaults<IEraser>

    set.call(this, {}, toolDefaults.ERASER)
  }

  init = (gl: WebGL2RenderingContext) => {
    this.brush.init(gl)
  }

  switchTo = (gl: WebGL2RenderingContext) => {
    this.brush.switchTo(gl)
  }

  draw = (gl: WebGL2RenderingContext, operation: IOperation) => {
    gl.blendFunc(gl.CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.enable(gl.BLEND)

    gl.blendEquation(gl.FUNC_REVERSE_SUBTRACT)

    this.brush.base(gl, operation)
  }
}
