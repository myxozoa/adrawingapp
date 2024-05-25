//https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#use_non-blocking_async_data_readback
function clientWaitAsync(gl: WebGL2RenderingContext, sync: WebGLSync, flags: GLint, intervalMs: number) {
  return new Promise<void>((resolve, reject) => {
    function test() {
      const result = gl.clientWaitSync(sync, flags, 0)
      if (result === gl.WAIT_FAILED) {
        reject()
        return
      }
      if (result === gl.TIMEOUT_EXPIRED) {
        setTimeout(test, intervalMs)
        return
      }
      resolve()
    }
    test()
  })
}

async function getBufferSubDataAsync(
  gl: WebGL2RenderingContext,
  target: GLint,
  buffer: WebGLBuffer,
  sourceByteOffset: number,
  destinationBuffer: ArrayBufferView,
  destinationOffset?: number,
  length?: number,
) {
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0)

  if (!sync) throw new Error("Unable to create sync to save image")

  gl.flush()

  await clientWaitAsync(gl, sync, 0, 10)
  gl.deleteSync(sync)

  gl.bindBuffer(target, buffer)
  gl.getBufferSubData(target, sourceByteOffset, destinationBuffer, destinationOffset, length)
  gl.bindBuffer(target, null)

  return destinationBuffer
}

export async function readPixelsAsync(
  gl: WebGL2RenderingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  format: GLint,
  type: GLint,
  destinationBuffer: ArrayBufferView,
) {
  const buffer = gl.createBuffer()

  if (!buffer) throw new Error("Unable to create buffer to save image")

  gl.pixelStorei(gl.PACK_ALIGNMENT, 1)

  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buffer)
  gl.bufferData(gl.PIXEL_PACK_BUFFER, destinationBuffer.byteLength, gl.STREAM_READ)
  gl.readPixels(x, y, width, height, format, type, 0)
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null)

  await getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buffer, 0, destinationBuffer)

  gl.deleteBuffer(buffer)
  return destinationBuffer
}
