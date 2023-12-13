import { useRef, useLayoutEffect } from 'react'

import { initializeCanvas, scaleNumberToRange } from '../../utils'

import { createProgram, createShader } from '../../glutils'

import { toolPreviewSize } from '../../constants'

import { useToolStore } from '../../stores/ToolStore'
import { useMainStore } from '../../stores/MainStore'

import fragment from '../../shaders/Brush/fragment.glsl?raw'
import vertex from '../../shaders/Brush/vertex.glsl?raw'

let cache = null

const initGL = (gl: WebGL2RenderingContext) => {
  if (cache) {
    return cache
  }

  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragment)
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertex)

  const program = createProgram(gl, vertexShader, fragmentShader)

  const positionAttributeLocation = gl.getAttribLocation(program, "a_position")

  const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution")
  const brushColorUniformLocation = gl.getUniformLocation(program, "u_brush_color")
  const softnessUniformLocation = gl.getUniformLocation(program, "u_softness")
  const sizeUniformLocation = gl.getUniformLocation(program, "u_size")

  const positionBuffer = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

  const positions = [
    -1, -1,  // first triangle
    1, -1,
    -1,  1,
    -1,  1,  // second triangle
    1, -1,
    1,  1,
  ]
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

  const vao = gl.createVertexArray()

  gl.bindVertexArray(vao)

  gl.enableVertexAttribArray(positionAttributeLocation)

  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0)

  gl.useProgram(program)

  cache = { program, vao, resolutionUniformLocation, brushColorUniformLocation, softnessUniformLocation, sizeUniformLocation }

  return cache
}

function _ToolPreview() {
  const previewCanvasRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
  const currentTool = useToolStore.use.currentTool()
  const color = useMainStore.use.color()

  useLayoutEffect(() => {
    initializeCanvas(previewCanvasRef.current, toolPreviewSize, toolPreviewSize)
  }, [previewCanvasRef.current])

  useLayoutEffect(() => {
    if (previewCanvasRef.current) {
      const gl = previewCanvasRef.current.getContext('webgl2') as WebGL2RenderingContext

      const { resolutionUniformLocation, brushColorUniformLocation, softnessUniformLocation, sizeUniformLocation } = initGL(gl)

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height)
      gl.uniform3fv(brushColorUniformLocation, color.map(c => c / 255))
      gl.uniform1f(softnessUniformLocation, currentTool.hardness / 100)
      gl.uniform1f(sizeUniformLocation, 40 - scaleNumberToRange(currentTool.size, 5, 50, 25, 38))

      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
  }, [currentTool.size, currentTool.hardness, color])

  return (
    <canvas className='bg-black' ref={previewCanvasRef} width={toolPreviewSize} height={toolPreviewSize} />
  )
}

export const ToolPreview = _ToolPreview