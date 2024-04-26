import { usePreferenceStore } from "@/stores/PreferenceStore"

import { throttleRAF } from "@/utils.ts"

import { MouseState, RenderInfo } from "@/types.ts"

import { mat3, vec2 } from "gl-matrix"

import { Camera } from "@/objects/Camera"
import { ResourceManager } from "@/managers/ResourceManager"
import { createCanvasRenderTexture } from "@/resources/canvasRenderTexture"

import renderTextureFragment from "@/shaders/TexToScreen/texToScreen.frag?raw"
import renderTextureVertex from "@/shaders/TexToScreen/texToScreen.vert?raw"
import scratchFragment from "@/shaders/Scratch/scratch.frag?raw"
import scratchVertex from "@/shaders/Scratch/scratch.vert?raw"

import { createTransparencyGrid } from "@/resources/transparencyGrid"
import { createFullscreenQuad } from "@/resources/fullscreenQuad"
import { Application } from "@/managers/ApplicationManager"
import { InteractionManager } from "@/managers/InteractionManager"

export function renderUniforms(gl: WebGL2RenderingContext, reference: RenderInfo) {
  gl.uniformMatrix3fv(reference.programInfo?.uniforms.u_matrix, false, Camera.project(reference.data!.matrix!))
}

export function gridRenderUniforms(gl: WebGL2RenderingContext, reference: RenderInfo) {
  const prefs = usePreferenceStore.getState().prefs
  const size = prefs.canvasWidth * 0.01

  gl.uniform1f(reference.programInfo?.uniforms.u_size, size)
  renderUniforms(gl, reference)
}

const startThrottle = throttleRAF()
const renderThrottle = throttleRAF()

enum pixelInterpolation {
  nearest,
  trilinear,
}

const transparent = new Float32Array([0, 0, 0, 0])

class _DrawingManager {
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  pixelInterpolation: pixelInterpolation
  initialized: boolean

  state: {
    renderInfo: RenderInfo
  }

  constructor() {
    this.waitUntilInteractionEnd = false
    this.needRedraw = false
  }

  public swapPixelInterpolation = () => {
    const gl = Application.gl

    // Swap to Nearest Neighbor mipmap interpolation when zoomed very closely
    if (Camera.zoom > 3.5) {
      if (this.pixelInterpolation !== pixelInterpolation.nearest) {
        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("DisplayLayer").bufferInfo?.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)

        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("ScratchLayer").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)

        gl.bindTexture(gl.TEXTURE_2D, null)

        this.pixelInterpolation = pixelInterpolation.nearest
      }
    } else {
      if (this.pixelInterpolation !== pixelInterpolation.trilinear) {
        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("DisplayLayer").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, Application.textureSupport.magFilterType)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, Application.textureSupport.minFilterType)

        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("ScratchLayer").bufferInfo.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, Application.textureSupport.magFilterType)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, Application.textureSupport.minFilterType)

        gl.bindTexture(gl.TEXTURE_2D, null)

        this.pixelInterpolation = pixelInterpolation.trilinear
      }
    }
  }

  public render = () => {
    const prefs = usePreferenceStore.getState().prefs
    const gl = Application.gl

    // Draw Screen
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.scissor(0, 0, gl.canvas.width, gl.canvas.height)

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.blendEquation(gl.FUNC_ADD)

    this.renderToScreen(ResourceManager.get("Background"), false)

    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    const transparencyGrid = ResourceManager.get("TransparencyGrid")

    this.renderToScreen(transparencyGrid, false, gridRenderUniforms)

    const displayLayer = ResourceManager.get("DisplayLayer")

    this.renderToScreen(displayLayer, true, renderUniforms)

    const scratchLayerTexture = ResourceManager.get("ScratchLayer")

    this.renderToScreen(scratchLayerTexture, true, renderUniforms)
  }

  public clearSpecific = (renderInfo: RenderInfo, color?: Float32Array) => {
    const prefs = usePreferenceStore.getState().prefs

    const gl = Application.gl

    gl.bindFramebuffer(gl.FRAMEBUFFER, renderInfo.bufferInfo.framebuffer)

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    this.clear(color)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  public applyScratchLayer = () => {
    const scratchLayer = ResourceManager.get("ScratchLayer")
    const intermediaryLayer = ResourceManager.get("IntermediaryLayer")
    const displayLayer = ResourceManager.get("DisplayLayer")

    const prefs = usePreferenceStore.getState().prefs

    const gl = Application.gl

    gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.blendEquation(gl.FUNC_ADD)

    gl.bindFramebuffer(gl.FRAMEBUFFER, intermediaryLayer.bufferInfo?.framebuffer)

    gl.useProgram(intermediaryLayer.programInfo?.program)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, scratchLayer.bufferInfo?.texture)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, displayLayer.bufferInfo?.texture)

    gl.bindBuffer(gl.ARRAY_BUFFER, intermediaryLayer.programInfo?.VBO)
    gl.bindVertexArray(intermediaryLayer.programInfo?.VAO)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    gl.activeTexture(gl.TEXTURE0)

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, intermediaryLayer.bufferInfo?.framebuffer)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, displayLayer.bufferInfo?.framebuffer)

    gl.blitFramebuffer(
      0,
      0,
      prefs.canvasWidth,
      prefs.canvasHeight,
      0,
      0,
      prefs.canvasWidth,
      prefs.canvasHeight,
      gl.COLOR_BUFFER_BIT,
      gl.NEAREST,
    )

    gl.useProgram(null)
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)

    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
  }

  /**
   * Set up everything we need
   *
   * This should be called before starting the render loop
   */
  public init = () => {
    if (this.initialized) return

    const prefs = usePreferenceStore.getState().prefs
    const gl = Application.gl

    gl.enable(gl.SCISSOR_TEST)
    gl.enable(gl.BLEND)
    gl.enable(gl.DEPTH_TEST)

    gl.disable(gl.CULL_FACE)
    gl.disable(gl.RASTERIZER_DISCARD)
    gl.disable(gl.DITHER)
    gl.disable(gl.STENCIL_TEST)
    gl.disable(gl.POLYGON_OFFSET_FILL)
    gl.depthMask(false)

    gl.depthFunc(gl.LESS)

    gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST)

    ResourceManager.create("TransparencyGrid", createTransparencyGrid(gl, prefs.canvasWidth, prefs.canvasHeight))

    ResourceManager.create("Background", createFullscreenQuad(gl))

    ResourceManager.create(
      "ScratchLayer",
      createCanvasRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight, renderTextureFragment, renderTextureVertex),
    )

    const scratch = ResourceManager.get("ScratchLayer")
    this.clearSpecific(scratch, new Float32Array([0, 0, 0, 0]))

    ResourceManager.create(
      "DisplayLayer",
      createCanvasRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight, renderTextureFragment, renderTextureVertex),
    )

    ResourceManager.create(
      "IntermediaryLayer",
      createCanvasRenderTexture(gl, prefs.canvasWidth, prefs.canvasHeight, scratchFragment, scratchVertex, [
        "u_source_texture",
        "u_destination_texture",
      ]),
    )
    const intermediaryLayer = ResourceManager.get("IntermediaryLayer")
    this.clearSpecific(intermediaryLayer, new Float32Array([0, 0, 0, 0]))

    // Prepare a matrix for -1/1 viewport coordinates so this can be drawn inside a canvas texture
    mat3.scale(
      intermediaryLayer.data?.matrix,
      intermediaryLayer.data?.matrix,
      vec2.fromValues(1 / (prefs.canvasWidth / 2), 1 / (prefs.canvasHeight / 2)),
    )

    mat3.translate(
      intermediaryLayer.data?.matrix,
      intermediaryLayer.data?.matrix,
      vec2.fromValues(-prefs.canvasWidth / 2, -prefs.canvasHeight / 2),
    )

    gl.useProgram(intermediaryLayer.programInfo?.program)

    gl.uniform1i(intermediaryLayer.programInfo?.uniforms.u_source_texture, 0)

    gl.uniform1i(intermediaryLayer.programInfo?.uniforms.u_destination_texture, 1)

    gl.uniformMatrix3fv(intermediaryLayer.programInfo?.uniforms.u_matrix, false, intermediaryLayer.data?.matrix)

    gl.useProgram(null)

    this.initialized = true
  }

  public beginDraw = (pointerState: MouseState) => {
    InteractionManager.process(pointerState)

    renderThrottle(this.render)
  }

  public continueDraw = (pointerState: MouseState) => {
    InteractionManager.process(pointerState)

    renderThrottle(this.render)
  }

  public start = () => {
    startThrottle(this.render)
  }

  /**
   * Draw render texture to the canvas draw buffer
   */
  public renderToScreen = (
    renderInfo: RenderInfo,
    mipmap: boolean,
    setUniforms?: (gl: WebGL2RenderingContext, reference: RenderInfo) => void,
  ) => {
    const gl = Application.gl

    if (renderInfo.programInfo?.program) gl.useProgram(renderInfo.programInfo?.program)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    if (renderInfo.bufferInfo?.texture) gl.bindTexture(gl.TEXTURE_2D, renderInfo.bufferInfo?.texture)

    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D)

    if (renderInfo.programInfo?.VBO) gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo?.VBO)
    if (renderInfo.programInfo?.VAO) gl.bindVertexArray(renderInfo.programInfo?.VAO)

    if (setUniforms) setUniforms(gl, renderInfo)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    // Unbind
    if (renderInfo.programInfo?.VBO) gl.bindBuffer(gl.ARRAY_BUFFER, null)
    if (renderInfo.bufferInfo?.texture) gl.bindTexture(gl.TEXTURE_2D, null)
    if (renderInfo.programInfo?.VAO) gl.bindVertexArray(null)
  }

  /** Fill clear on whatever the current WebGL state is */
  public clear = (color = transparent) => {
    const gl = Application.gl

    gl.clearBufferfv(gl.COLOR, 0, color)
  }

  public clearAll = () => {
    for (const resource of Object.values(ResourceManager.resources)) {
      if (resource.bufferInfo?.framebuffer) {
        this.clearSpecific(resource)
      }
    }

    this.render()
  }

  // TODO: Reimplement undo
  public undo = () => {
    //   if (this.currentLayer.undoSnapshotQueue.length > 0 && this.currentOperation.points.length === 0) {
    //     this.currentLayer.redoSnapshotQueue.push(this.currentLayer.undoSnapshotQueue.pop())
    //   }
    //   this.endInteraction(false)
  }
}

export const DrawingManager = new _DrawingManager()
