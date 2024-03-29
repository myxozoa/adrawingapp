import { tool_list } from "@/constants"
import { Tool, toolDefaults, toolProperties } from "@/objects/Tool"
import { ColorArray, EyeDropperSampleSizes, IEyedropper, IOperation } from "@/types"

import { useMainStore } from "@/stores/MainStore"
import { glPickPosition } from "@/utils"

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#use_non-blocking_async_data_readback
function clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: number, interval_ms: number) {
  return new Promise((resolve, reject) => {
    function test() {
      const res = gl.clientWaitSync(sync, flags, 0)
      if (res === gl.WAIT_FAILED) {
        reject()
        return
      }
      if (res === gl.TIMEOUT_EXPIRED) {
        setTimeout(test, interval_ms)
        return
      }
      resolve(null)
    }
    test()
  })
}

/**
 * @throws If unable to fence sync
 */
async function getBufferSubDataAsync(
  gl: WebGL2RenderingContext,
  target: number,
  buffer: WebGLBuffer,
  srcByteOffset: number,
  dstBuffer: ArrayBufferView,
  dstOffset?: number,
  length?: number,
) {
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)

  if (!sync) throw new Error("Unable to fence sync")

  gl.flush()

  await clientWaitAsync(gl, sync, 0, 10)
  gl.deleteSync(sync)

  gl.bindBuffer(target, buffer)
  gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length)
  gl.bindBuffer(target, null)

  return dstBuffer
}

/**
 * @throws If unable to create buffer
 */
async function readPixelsAsync(
  gl: WebGL2RenderingContext,
  x: number,
  y: number,
  w: number,
  h: number,
  format: number,
  type: number,
  dest: ArrayBufferView,
) {
  const buf = gl.createBuffer()

  if (!buf) throw new Error("Unable to create async read buffer")

  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf)
  gl.bufferData(gl.PIXEL_PACK_BUFFER, dest.byteLength, gl.STREAM_READ)
  gl.readPixels(x, y, w, h, format, type, 0)
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)

  await getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dest)

  gl.deleteBuffer(buf)
  return dest
}

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

    setColor(color.slice(0, 3) as ColorArray)
  }
}
