import { usePreferenceStore } from "@/stores/PreferenceStore"

import { throttleRAF, CanvasSizeCache } from "@/utils.ts"

import { MouseState, RenderInfo } from "@/types.ts"

import { mat3, vec2 } from "gl-matrix"

import { Camera } from "@/objects/Camera"
import { ResourceManager } from "@/managers/ResourceManager"
import { createCanvasRenderTexture } from "@/resources/canvasRenderTexture"

import renderTextureFragment from "@/shaders/TexToScreen/texToScreen.frag?raw"
import renderTextureVertex from "@/shaders/TexToScreen/texToScreen.vert?raw"
import layerCompositionFragment from "@/shaders/LayerComposition/layerComposition.frag?raw"
import layerCompositionVertex from "@/shaders/LayerComposition/layerComposition.vert?raw"

import { createTransparencyGrid } from "@/resources/transparencyGrid"
import { createFullscreenQuad } from "@/resources/fullscreenQuad"
import { Application } from "@/managers/ApplicationManager"
import { InteractionManager } from "@/managers/InteractionManager"
import { useLayerStore } from "@/stores/LayerStore"

import { Layer } from "@/objects/Layer"
import { useToolStore } from "@/stores/ToolStore"

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
const white = new Float32Array([1, 1, 1, 1])

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
    if (Camera.zoom > 2.5) {
      if (this.pixelInterpolation !== pixelInterpolation.nearest) {
        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("IntermediaryLayer").bufferInfo?.texture)

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)

        gl.bindTexture(gl.TEXTURE_2D, null)

        this.pixelInterpolation = pixelInterpolation.nearest
      }
    } else {
      if (this.pixelInterpolation !== pixelInterpolation.trilinear) {
        gl.bindTexture(gl.TEXTURE_2D, ResourceManager.get("IntermediaryLayer").bufferInfo.texture)

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
    const intermediaryLayer = ResourceManager.get("IntermediaryLayer")

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    this.clearSpecific(intermediaryLayer)

    // Draw Screen
    gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)
    gl.scissor(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.blendEquation(gl.FUNC_ADD)

    this.swapPixelInterpolation()

    this.renderToScreen(ResourceManager.get("Background"), false)

    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    this.renderToScreen(ResourceManager.get("TransparencyGrid"), false, gridRenderUniforms)

    this.compositeLayers()

    this.renderToScreen(intermediaryLayer, true, renderUniforms, ResourceManager.get("DisplayLayer"))
  }

  public clearSpecific = (renderInfo: RenderInfo, color?: Float32Array) => {
    const prefs = usePreferenceStore.getState().prefs

    const gl = Application.gl

    gl.bindFramebuffer(gl.FRAMEBUFFER, renderInfo.bufferInfo.framebuffer)

    gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    this.clear(color)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  public compositeLayers = () => {
    const gl = Application.gl
    const emptyLayer = ResourceManager.get("EmptyLayer")
    const intermediaryLayer = ResourceManager.get("IntermediaryLayer")

    const prefs = usePreferenceStore.getState().prefs
    const currentTool = useToolStore.getState().currentTool

    const layers = useLayerStore.getState().layers
    const currentLayerID = useLayerStore.getState().currentLayer.id
    const currentLayerIndex = layers.findIndex((layer) => layer.id === currentLayerID)

    gl.bindFramebuffer(gl.FRAMEBUFFER, intermediaryLayer.bufferInfo?.framebuffer)
    gl.useProgram(intermediaryLayer.programInfo?.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, intermediaryLayer.programInfo?.VBO)
    gl.bindVertexArray(intermediaryLayer.programInfo?.VAO)

    gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.blendEquation(gl.FUNC_ADD)

    // Layers below current
    for (let i = 0; i < currentLayerIndex; i += 2) {
      const layer = layers[i]
      const layer2 = layers[i + 1]

      const layerResource = ResourceManager.get(`Layer${layer.id}`)

      if (layer2) {
        const layer2Resource = ResourceManager.get(`Layer${layer2.id}`)

        gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, layer2.blendMode)
        gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, layer2.opacity)

      this.compositeLayer(layer2Resource, layerResource)
      } else {
        gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, 0)
        gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, 1)

        this.compositeLayer(emptyLayer, layerResource)
      }
    }

    const currentLayer = ResourceManager.get(`Layer${currentLayerID}`)

    const scratchLayer = ResourceManager.get("ScratchLayer")

    gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, 0)
    gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, (currentTool.settings.opacity as number) / 100)

    this.compositeLayer(scratchLayer, currentLayer)

    // Layers above current
    for (let i = currentLayerIndex + 1; i < layers.length; i += 2) {
      const layer = layers[i]
      const layer2 = layers[i + 1]

      const layerResource = ResourceManager.get(`Layer${layer.id}`)

      if (layer2) {
        const layer2Resource = ResourceManager.get(`Layer${layer2.id}`)

        gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, layer2.blendMode)
        gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, layer2.opacity)

      this.compositeLayer(layer2Resource, layerResource)
      } else {
        gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, 0)
        gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, 1)

        this.compositeLayer(emptyLayer, layerResource)
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    gl.bindVertexArray(null)
    gl.useProgram(null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  private compositeLayer = (top: RenderInfo, bottom: RenderInfo) => {
    const gl = Application.gl

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, top.bufferInfo?.texture)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, bottom.bufferInfo?.texture)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  public commitLayer = (top: RenderInfo, bottom: RenderInfo, destination: RenderInfo) => {
    const gl = Application.gl
    const intermediaryLayer = ResourceManager.get("IntermediaryLayer")

    this.clearSpecific(intermediaryLayer)

    const prefs = usePreferenceStore.getState().prefs

    gl.bindFramebuffer(gl.FRAMEBUFFER, intermediaryLayer.bufferInfo?.framebuffer)
    gl.useProgram(intermediaryLayer.programInfo?.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, intermediaryLayer.programInfo?.VBO)
    gl.bindVertexArray(intermediaryLayer.programInfo?.VAO)

    gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    gl.disable(gl.BLEND)

    this.compositeLayer(top, bottom)

    this.blit(intermediaryLayer, destination)

    this.clearSpecific(intermediaryLayer)

    gl.enable(gl.BLEND)
  }

  public blit = (source: RenderInfo, destination: RenderInfo) => {
    const gl = Application.gl
    const prefs = usePreferenceStore.getState().prefs

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, source.bufferInfo?.framebuffer)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destination.bufferInfo?.framebuffer)

    gl.blitFramebuffer(
      0,
      0,
      prefs.canvasWidth,
      prefs.canvasHeight,
      0,
      0,
      prefs.canvasWidth,
      prefs.canvasHeight,
      gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT,
      gl.NEAREST,
    )

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
  }

  /**
   * Set up everything we need
   *
   * This should be called before starting the render loop
   */
  public init = () => {
    if (this.initialized) return

    const prefs = usePreferenceStore.getState().prefs
    const layers = useLayerStore.getState().layers
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
      createCanvasRenderTexture(
        gl,
        prefs.canvasWidth,
        prefs.canvasHeight,
        renderTextureFragment,
        renderTextureVertex,
        false,
      ),
    )

    ResourceManager.create(
      "EmptyLayer",
      createCanvasRenderTexture(
        gl,
        prefs.canvasWidth,
        prefs.canvasHeight,
        renderTextureFragment,
        renderTextureVertex,
        false,
      ),
    )

    // this.clearSpecific(scratch, new Float32Array([0, 0, 0, 1]))

    ResourceManager.create(
      "DisplayLayer",
      createCanvasRenderTexture(
        gl,
        prefs.canvasWidth,
        prefs.canvasHeight,
        renderTextureFragment,
        renderTextureVertex,
        false,
      ),
    )

    // this.clearSpecific(displayLayer, new Float32Array([1, 1, 1, 1]))

    for (const layer of layers) {
      this.newLayer(layer)
    }

    const currentLayerId = useLayerStore.getState().currentLayer.id

    const currentLayer = ResourceManager.get(`Layer${currentLayerId}`)

    this.clearSpecific(currentLayer, white)

    const intermediaryLayer = ResourceManager.create(
      "IntermediaryLayer",
      createCanvasRenderTexture(
        gl,
        prefs.canvasWidth,
        prefs.canvasHeight,
        layerCompositionFragment,
        layerCompositionVertex,
        true,
        ["u_bottom_texture", "u_top_texture", "u_blend_mode", "u_opacity"],
      ),
    )

    gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, 0)
    gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, 1)

    // this.clearSpecific(intermediaryLayer, new Float32Array([0, 0, 0, 0]))

    // Prepare a matrix for -1/1 viewport coordinates so this can be drawn inside a canvas texture

    // TODO: clean up these assertions
    mat3.scale(
      intermediaryLayer.data!.matrix!,
      intermediaryLayer.data!.matrix!,
      vec2.fromValues(1 / (prefs.canvasWidth / 2), 1 / (prefs.canvasHeight / 2)),
    )

    mat3.translate(
      intermediaryLayer.data!.matrix!,
      intermediaryLayer.data!.matrix!,
      vec2.fromValues(-prefs.canvasWidth / 2, -prefs.canvasHeight / 2),
    )

    gl.useProgram(intermediaryLayer.programInfo?.program)

    gl.uniform1i(intermediaryLayer.programInfo?.uniforms.u_bottom_texture, 0)

    gl.uniform1i(intermediaryLayer.programInfo?.uniforms.u_top_texture, 1)

    gl.uniformMatrix3fv(intermediaryLayer.programInfo?.uniforms.u_matrix, false, intermediaryLayer.data!.matrix!)

    gl.useProgram(null)

    this.initialized = true
  }

  public newLayer = (layer: Layer) => {
    const gl = Application.gl
    const prefs = usePreferenceStore.getState().prefs

    ResourceManager.create(
      `Layer${layer.id}`,
      createCanvasRenderTexture(
        gl,
        prefs.canvasWidth,
        prefs.canvasHeight,
        renderTextureFragment,
        renderTextureVertex,
        false,
      ),
    )
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
    overrides?: RenderInfo,
  ) => {
    const gl = Application.gl

    gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)
    gl.scissor(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)

    // TODO: Better override system
    if (overrides?.programInfo?.program) {
      gl.useProgram(overrides.programInfo?.program)
    } else if (renderInfo.programInfo?.program) gl.useProgram(renderInfo.programInfo?.program)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    if (renderInfo.bufferInfo?.texture) gl.bindTexture(gl.TEXTURE_2D, renderInfo.bufferInfo?.texture)

    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D)

    if (renderInfo.programInfo?.VBO) gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo?.VBO)
    if (renderInfo.programInfo?.VAO) gl.bindVertexArray(renderInfo.programInfo?.VAO)

    if (setUniforms && overrides?.programInfo?.uniforms) setUniforms(gl, overrides)
    else if (setUniforms) setUniforms(gl, renderInfo)

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
    for (const [_, resource] of ResourceManager.resources) {
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

if (import.meta.env.DEV) {
  // @ts-expect-error Adding global for debugging purposes
  window.__DrawingManager = DrawingManager
}
