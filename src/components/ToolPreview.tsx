import { useRef, useLayoutEffect } from "react"

import { initializeCanvas } from "@/utils"

import * as glUtils from "@/glUtils"

import { toolPreviewSize } from "@/constants"

import { useToolStore } from "@/stores/ToolStore"
import { useMainStore } from "@/stores/MainStore"

import fragment from "@/shaders/BrushPreview/brushPreview.frag?raw"
import vertex from "@/shaders/BrushPreview/brushPreview.vert?raw"

let cache: {
  program: WebGLProgram
  vao: WebGLBuffer
  uniforms: Record<string, WebGLUniformLocation>
} | null = null

const initGL = (gl: WebGL2RenderingContext) => {
  if (cache) {
    return cache
  }

  const fragmentShader = glUtils.createShader(gl, gl.FRAGMENT_SHADER, fragment)
  const vertexShader = glUtils.createShader(gl, gl.VERTEX_SHADER, vertex)

  const program = glUtils.createProgram(gl, vertexShader, fragmentShader)

  const attributeNames = ["a_position"]

  const attributes = glUtils.getAttributeLocations(gl, program, attributeNames)

  // const uniformNames = ["u_resolution", "u_brush_color", "u_softness", "u_size", "u_opacity"]
  const uniformNames = ["u_resolution", "u_brush_color", "u_softness"]

  const uniforms = glUtils.getUniformLocations(gl, program, uniformNames)

  const positionBuffer = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

  const positions = [
    -1,
    -1, // first triangle
    1,
    -1,
    -1,
    1,
    -1,
    1, // second triangle
    1,
    -1,
    1,
    1,
  ]
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

  const vao = gl.createVertexArray()

  if (!vao) throw new Error("Unable to create WebGL vertex buffer")

  gl.bindVertexArray(vao)

  gl.enableVertexAttribArray(attributes.a_position)

  gl.vertexAttribPointer(attributes.a_position, 2, gl.FLOAT, false, 0, 0)

  gl.useProgram(program)

  cache = { program, vao, uniforms }

  return cache
}

function _ToolPreview() {
  const previewCanvasRef = useRef() as React.MutableRefObject<HTMLCanvasElement>
  const currentTool = useToolStore.use.currentTool()
  const color = useMainStore.use.color()

  useLayoutEffect(() => {
    initializeCanvas(previewCanvasRef.current, toolPreviewSize, toolPreviewSize, {
      desynchronized: true,
      resize: false,
      powerPreference: "low-power",
    })
  }, [previewCanvasRef.current])

  useLayoutEffect(() => {
    if (previewCanvasRef.current) {
      const gl = previewCanvasRef.current.getContext("webgl2", {
        alpha: true,
        desynchronized: true,
        powerPreference: "low-power",
        premultipliedAlpha: false,
      }) as WebGL2RenderingContext

      const { uniforms } = initGL(gl)

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      gl.uniform2f(uniforms.u_resolution, gl.canvas.width, gl.canvas.height)
      gl.uniform3fv(
        uniforms.u_brush_color,
        color.map((c) => c / 255),
      )
      gl.uniform1f(uniforms.u_softness, currentTool.hardness / 100)
      // gl.uniform1f(uniforms.u_size, 40 - scaleNumberToRange(currentTool.size, 1, 50, 10, 38))
      // gl.uniform1f(uniforms.u_opacity, currentTool.opacity / 100)

      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }
  }, [currentTool.size, currentTool.hardness, currentTool.opacity, color])

  return <canvas className="bg-black" ref={previewCanvasRef} width={toolPreviewSize} height={toolPreviewSize} />
}

export const ToolPreview = _ToolPreview
