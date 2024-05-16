import { usePreferenceStore } from "@/stores/PreferenceStore"

import { CanvasSizeCache } from "@/utils/utils"

import { RenderInfo } from "@/types.ts"

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
import { useLayerStore } from "@/stores/LayerStore"

import { InteractionManager } from "@/managers/InteractionManager"

import { Layer } from "@/objects/Layer"
import { useToolStore } from "@/stores/ToolStore"
import { Cursor } from "@/objects/Cursor"
import { isBrush, isEraser } from "@/utils/typeguards"

export function renderUniforms(gl: WebGL2RenderingContext, reference: RenderInfo) {
  gl.uniformMatrix3fv(reference.programInfo?.uniforms.u_matrix, false, Camera.project(reference.data!.matrix!))
}

export function gridRenderUniforms(gl: WebGL2RenderingContext, reference: RenderInfo) {
  const prefs = usePreferenceStore.getState().prefs
  const size = prefs.canvasWidth * 0.01

  gl.uniform1f(reference.programInfo?.uniforms.u_size, size)
  renderUniforms(gl, reference)
}

// const doubleColorAttachments = [36064, 36065]
// const singleColorAttachment = [36064]

let readFramebuffer = 1
let writeFramebuffer = 0

let framebuffers: RenderInfo[] = []

enum pixelInterpolation {
  nearest,
  trilinear,
}

const transparent = new Float32Array([0, 0, 0, 0])
const white = new Float32Array([1, 1, 1, 1])

class _DrawingManager {
  waitUntilInteractionEnd: boolean
  needRedraw: boolean
  endDrawNextFrame: boolean
  pixelInterpolation: pixelInterpolation
  private shouldRecomposite: boolean
  private shouldShowCursor: boolean

  state: {
    renderInfo: RenderInfo
  }

  constructor() {
    this.waitUntilInteractionEnd = false
    this.needRedraw = true
    this.endDrawNextFrame = false

    this.shouldRecomposite = true

    this.shouldShowCursor = false
  }

  public swapPixelInterpolation = () => {
    const gl = Application.gl

    const displayLayer = ResourceManager.get("DisplayLayer")

    // Swap to Nearest Neighbor mipmap interpolation when zoomed very closely
    if (Camera.zoom > 2.5) {
      if (this.pixelInterpolation !== pixelInterpolation.nearest) {
        gl.bindTexture(gl.TEXTURE_2D, displayLayer.bufferInfo?.textures[0])

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)

        this.pixelInterpolation = pixelInterpolation.nearest
      }
    } else {
      if (this.pixelInterpolation !== pixelInterpolation.trilinear) {
        gl.bindTexture(gl.TEXTURE_2D, displayLayer.bufferInfo.textures[0])

        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, Application.textureSupport.magFilterType)
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, Application.textureSupport.minFilterType)

        this.pixelInterpolation = pixelInterpolation.trilinear
      }
    }
  }

  public render = () => {
    const gl = Application.gl

    this.clearSpecific(framebuffers[readFramebuffer])
    this.clearSpecific(framebuffers[writeFramebuffer])

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    this.swapPixelInterpolation()

    this.renderToScreen(ResourceManager.get("Background"), false)

    this.renderToScreen(ResourceManager.get("TransparencyGrid"), false, gridRenderUniforms)

    const displayLayer = ResourceManager.get("DisplayLayer")

    if (this.shouldRecomposite) {
      this.compositeLayers()

      this.blit(framebuffers[readFramebuffer], displayLayer)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    this.renderToScreen(displayLayer, true, renderUniforms)

    if (this.shouldShowCursor) {
      Cursor.draw(gl, InteractionManager.currentMousePosition)
    }
  }

  public clearSpecific = (renderInfo: RenderInfo, color?: Float32Array) => {
    const prefs = usePreferenceStore.getState().prefs

    const gl = Application.gl

    gl.bindFramebuffer(gl.FRAMEBUFFER, renderInfo.bufferInfo.framebuffer)

    gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    this.clear(color)
  }

  public compositeLayers = () => {
    const gl = Application.gl

    const intermediaryLayer = ResourceManager.get("IntermediaryLayer")
    const intermediaryLayer3 = ResourceManager.get("IntermediaryLayer3")
    const emptyLayer = ResourceManager.get("EmptyLayer")

    const prefs = usePreferenceStore.getState().prefs
    const currentTool = useToolStore.getState().currentTool

    const layers = useLayerStore.getState().layers
    const currentLayerID = useLayerStore.getState().currentLayer.id
    gl.useProgram(intermediaryLayer.programInfo?.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, framebuffers[writeFramebuffer].programInfo?.VBO)
    gl.bindVertexArray(framebuffers[writeFramebuffer].programInfo?.VAO)

    gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    gl.disable(gl.BLEND)

    // Composite scratch layer with current layer into intermediaryLayer3
    const scratchLayer = ResourceManager.get("ScratchLayer")
    const currentLayer = ResourceManager.get(`Layer${currentLayerID}`)

    gl.bindFramebuffer(gl.FRAMEBUFFER, intermediaryLayer3.bufferInfo.framebuffer)

    if (isBrush(currentTool)) {
      gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, 1)
      gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, currentTool.settings.opacity / 100)
    } else if (isEraser(currentTool)) {
      gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, 0)
      gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, currentTool.settings.opacity / 100)
    } else {
      gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, 1)
      gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, 1)
    }

    this.compositeLayer(scratchLayer.bufferInfo.textures[0], currentLayer.bufferInfo.textures[0])

    // Composite First layer against an empty texture
    const firstLayer = layers[0]
    const firsLayerResource = ResourceManager.get(`Layer${firstLayer.id}`)

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[writeFramebuffer].bufferInfo.framebuffer)

    gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, firstLayer.blendMode)
    gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, firstLayer.opacity / 100)

    if (firstLayer.id !== currentLayerID) {
      this.compositeLayer(firsLayerResource.bufferInfo.textures[0], emptyLayer.bufferInfo.textures[0])
    } else {
      this.compositeLayer(intermediaryLayer3.bufferInfo.textures[0], emptyLayer.bufferInfo.textures[0])

      this.clearSpecific(intermediaryLayer3)
    }

    readFramebuffer = Number(!readFramebuffer)
    writeFramebuffer = Number(!writeFramebuffer)

    // Layers above first layer
    for (let i = 1; i < layers.length; i++) {
      const layer = layers[i]
      const layerResource = ResourceManager.get(`Layer${layer.id}`)

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[writeFramebuffer].bufferInfo.framebuffer)

      gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, layer.blendMode)
      gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, layer.opacity / 100)

      if (layer.id !== currentLayerID) {
        this.compositeLayer(layerResource.bufferInfo.textures[0], framebuffers[readFramebuffer].bufferInfo.textures[0])
      } else {
        this.compositeLayer(
          intermediaryLayer3.bufferInfo.textures[0],
          framebuffers[readFramebuffer].bufferInfo.textures[0],
        )

        this.clearSpecific(intermediaryLayer3)
      }

      readFramebuffer = Number(!readFramebuffer)
      writeFramebuffer = Number(!writeFramebuffer)
    }

    gl.enable(gl.BLEND)

    this.shouldRecomposite = false
  }

  private compositeLayer = (top: WebGLTexture, bottom: WebGLTexture) => {
    const gl = Application.gl

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, top)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, bottom)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  public commitLayer = (top: RenderInfo, bottom: RenderInfo, destination: RenderInfo) => {
    const gl = Application.gl
    const intermediaryLayer3 = ResourceManager.get("IntermediaryLayer3")
    const currentTool = useToolStore.getState().currentTool

    const prefs = usePreferenceStore.getState().prefs

    gl.bindFramebuffer(gl.FRAMEBUFFER, intermediaryLayer3.bufferInfo.framebuffer)
    gl.useProgram(intermediaryLayer3.programInfo?.program)
    gl.bindBuffer(gl.ARRAY_BUFFER, intermediaryLayer3.programInfo?.VBO)
    gl.bindVertexArray(intermediaryLayer3.programInfo?.VAO)

    gl.viewport(0, 0, prefs.canvasWidth, prefs.canvasHeight)
    gl.scissor(0, 0, prefs.canvasWidth, prefs.canvasHeight)

    gl.disable(gl.BLEND)

    if (isBrush(currentTool)) {
      gl.uniform1i(intermediaryLayer3.programInfo.uniforms.u_blend_mode, 1)
      gl.uniform1f(intermediaryLayer3.programInfo.uniforms.u_opacity, currentTool.settings.opacity / 100)
    } else if (isEraser(currentTool)) {
      gl.uniform1i(intermediaryLayer3.programInfo.uniforms.u_blend_mode, 0)
      gl.uniform1f(intermediaryLayer3.programInfo.uniforms.u_opacity, currentTool.settings.opacity / 100)
    } else {
      gl.uniform1i(intermediaryLayer3.programInfo.uniforms.u_blend_mode, 1)
      gl.uniform1f(intermediaryLayer3.programInfo.uniforms.u_opacity, 1)
    }

    this.compositeLayer(top.bufferInfo.textures[0], bottom.bufferInfo.textures[0])

    this.blit(intermediaryLayer3, destination)

    this.clearSpecific(intermediaryLayer3)

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
  }

  public copy = (source: WebGLFramebuffer, destination: WebGLTexture) => {
    const gl = Application.gl
    const prefs = usePreferenceStore.getState().prefs

    gl.bindFramebuffer(gl.FRAMEBUFFER, source)
    gl.bindTexture(gl.TEXTURE_2D, destination)

    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, prefs.canvasWidth, prefs.canvasHeight)
  }

  /**
   * Set up everything we need
   *
   * This should be called before starting the render loop
   */
  public init = () => {
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

    ResourceManager.create(
      "DisplayLayer",
      createCanvasRenderTexture(
        gl,
        prefs.canvasWidth,
        prefs.canvasHeight,
        renderTextureFragment,
        renderTextureVertex,
        true,
      ),
    )

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
        false,
        ["u_bottom_texture", "u_top_texture", "u_blend_mode", "u_opacity"],
      ),
    )

    const intermediaryLayer2 = ResourceManager.create(
      "IntermediaryLayer2",
      createCanvasRenderTexture(
        gl,
        prefs.canvasWidth,
        prefs.canvasHeight,
        layerCompositionFragment,
        layerCompositionVertex,
        false,
        ["u_bottom_texture", "u_top_texture", "u_blend_mode", "u_opacity"],
      ),
    )

    const intermediaryLayer3 = ResourceManager.create(
      "IntermediaryLayer3",
      createCanvasRenderTexture(
        gl,
        prefs.canvasWidth,
        prefs.canvasHeight,
        layerCompositionFragment,
        layerCompositionVertex,
        false,
        ["u_bottom_texture", "u_top_texture", "u_blend_mode", "u_opacity"],
      ),
    )

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

    // Prepare a matrix for -1/1 viewport coordinates so this can be drawn inside a canvas texture

    // TODO: clean up these assertions
    mat3.scale(
      intermediaryLayer2.data!.matrix!,
      intermediaryLayer2.data!.matrix!,
      vec2.fromValues(1 / (prefs.canvasWidth / 2), 1 / (prefs.canvasHeight / 2)),
    )

    mat3.translate(
      intermediaryLayer2.data!.matrix!,
      intermediaryLayer2.data!.matrix!,
      vec2.fromValues(-prefs.canvasWidth / 2, -prefs.canvasHeight / 2),
    )

    gl.useProgram(intermediaryLayer2.programInfo?.program)

    gl.uniform1i(intermediaryLayer2.programInfo?.uniforms.u_bottom_texture, 0)

    gl.uniform1i(intermediaryLayer2.programInfo?.uniforms.u_top_texture, 1)

    gl.uniformMatrix3fv(intermediaryLayer2.programInfo?.uniforms.u_matrix, false, intermediaryLayer2.data!.matrix!)

    // Prepare a matrix for -1/1 viewport coordinates so this can be drawn inside a canvas texture

    // TODO: clean up these assertions
    mat3.scale(
      intermediaryLayer3.data!.matrix!,
      intermediaryLayer3.data!.matrix!,
      vec2.fromValues(1 / (prefs.canvasWidth / 2), 1 / (prefs.canvasHeight / 2)),
    )

    mat3.translate(
      intermediaryLayer3.data!.matrix!,
      intermediaryLayer3.data!.matrix!,
      vec2.fromValues(-prefs.canvasWidth / 2, -prefs.canvasHeight / 2),
    )

    gl.useProgram(intermediaryLayer3.programInfo?.program)

    gl.uniform1i(intermediaryLayer3.programInfo?.uniforms.u_bottom_texture, 0)

    gl.uniform1i(intermediaryLayer3.programInfo?.uniforms.u_top_texture, 1)

    gl.uniformMatrix3fv(intermediaryLayer3.programInfo?.uniforms.u_matrix, false, intermediaryLayer3.data!.matrix!)

    Cursor.init(gl)

    framebuffers = [intermediaryLayer, intermediaryLayer2]
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

  public beginDraw = () => {
    this.needRedraw = true
    this.endDrawNextFrame = false
  }

  public pauseDrawNextFrame = () => {
    this.endDrawNextFrame = true
  }

  public start = () => {
    requestAnimationFrame(this.renderLoop)
    this.pauseDrawNextFrame()
  }

  public renderLoop = () => {
    if (this.needRedraw) {
      this.render()

      if (this.endDrawNextFrame) {
        this.needRedraw = false
        this.endDrawNextFrame = false
      }
    }
    requestAnimationFrame(this.renderLoop)
  }

  public recomposite = () => {
    this.shouldRecomposite = true
  }

  public hideCursor = () => {
    this.shouldShowCursor = false
  }

  public showCursor = () => {
    this.shouldShowCursor = true
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

    if (renderInfo.bufferInfo?.textures.length) gl.bindTexture(gl.TEXTURE_2D, renderInfo.bufferInfo?.textures[0])

    if (mipmap) gl.generateMipmap(gl.TEXTURE_2D)

    if (renderInfo.programInfo?.VBO) gl.bindBuffer(gl.ARRAY_BUFFER, renderInfo.programInfo?.VBO)
    if (renderInfo.programInfo?.VAO) gl.bindVertexArray(renderInfo.programInfo?.VAO)

    if (setUniforms && overrides?.programInfo?.uniforms) setUniforms(gl, overrides)
    else if (setUniforms) setUniforms(gl, renderInfo)

    gl.drawArrays(gl.TRIANGLES, 0, 6)
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

  // This is very slow for ARM processors when dealing with textures that may have inflight draw calls still going
  public empty = (texture: WebGLTexture) => {
    const gl = Application.gl
    const prefs = usePreferenceStore.getState().prefs

    const emptyLayer = ResourceManager.get("EmptyLayer")

    gl.bindFramebuffer(gl.FRAMEBUFFER, emptyLayer.bufferInfo.framebuffer)
    gl.bindTexture(gl.TEXTURE_2D, texture)

    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, prefs.canvasWidth, prefs.canvasHeight)
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
