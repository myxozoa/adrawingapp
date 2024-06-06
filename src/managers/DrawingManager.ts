import { CanvasSizeCache } from "@/utils/utils"

import type { Box, RenderInfo } from "@/types"

import { mat3, vec2 } from "gl-matrix"

import { Camera } from "@/objects/Camera"
import { ResourceManager } from "@/managers/ResourceManager"
import { createCanvasRenderTexture } from "@/resources/canvasRenderTexture"

import renderTextureFragment from "@/shaders/TexToScreen/texToScreen.frag"
import renderTextureVertex from "@/shaders/TexToScreen/texToScreen.vert"
import layerCompositionFragment from "@/shaders/LayerComposition/layerComposition.frag"
import layerCompositionVertex from "@/shaders/LayerComposition/layerComposition.vert"

import { createTransparencyGrid } from "@/resources/transparencyGrid"
import { createFullscreenQuad } from "@/resources/fullscreenQuad"
import { Application } from "@/managers/ApplicationManager"
import { useLayerStore } from "@/stores/LayerStore"

import { InteractionManager } from "@/managers/InteractionManager"

import { Layer } from "@/objects/Layer"
import { useToolStore } from "@/stores/ToolStore"
import { Cursor } from "@/objects/Cursor"
import { isBrush, isEraser } from "@/utils/typeguards"
import { PointerManager } from "@/managers/PointerManager"
import { InputManager } from "@/managers/InputManager"
import { usePreferenceStore } from "@/stores/PreferenceStore"

export function renderUniforms(gl: WebGL2RenderingContext, reference: RenderInfo) {
  gl.uniformMatrix3fv(reference.programInfo?.uniforms.u_matrix, false, Camera.project(reference.data!.matrix!))
}

export function gridRenderUniforms(gl: WebGL2RenderingContext, reference: RenderInfo) {
  const size = Application.canvasInfo.width * 0.01

  gl.uniform1f(reference.programInfo?.uniforms.u_size, size)
  renderUniforms(gl, reference)
}

// const doubleColorAttachments = [36064, 36065]
// const singleColorAttachment = [36064]

let readFramebuffer = 1
let writeFramebuffer = 0

let framebuffers: RenderInfo[] = []

enum InterpolationType {
  nearest,
  trilinear,
}

class BoundingBox {
  box: Box

  drawnTo: boolean

  constructor() {
    this.box = { x: 0, y: 0, width: 1, height: 1 }
    this.drawnTo = false
  }

  get x() {
    return this.box.x
  }

  get y() {
    return this.box.y
  }

  get width() {
    return this.box.width
  }

  get height() {
    return this.box.height
  }

  _set = (x: number, y: number, width: number, height: number) => {
    this.box.x = x
    this.box.y = y
    this.box.width = width
    this.box.height = height
  }

  set = (x: number, y: number, width: number, height: number) => {
    this._set(x, y, width, height)

    this.drawnTo = true
  }

  reset = () => {
    this.box.x = 0
    this.box.y = 0
    this.box.width = 1
    this.box.height = 1

    this.drawnTo = false
  }

  calculate = (x: number, y: number, width: number, height: number) => {
    if (!this.drawnTo) {
      this.set(x, y, width, height)
      return
    }

    const newBottomLeftX = Math.min(this.box.x, x)
    const newBottomLeftY = Math.min(this.box.y, y)

    const newUpperRightX = Math.max(this.box.x + this.box.width, x + width)
    const newUpperRightY = Math.max(this.box.y + this.box.height, y + height)

    const newWidth = newUpperRightX - newBottomLeftX
    const newHeight = newUpperRightY - newBottomLeftY

    this.box.x = newBottomLeftX
    this.box.y = newBottomLeftY

    this.box.width = newWidth
    this.box.height = newHeight
  }
}

export const strokeFrameBoundingBox = new BoundingBox()
export const scratchLayerBoundingBox = new BoundingBox()

const transparent = new Float32Array([0, 0, 0, 0])
const white = new Float32Array([1, 1, 1, 1])

// eslint-disable-next-line prefer-const
let waitUntilInteractionEnd = false
let needRedraw = true
let endDrawNextFrame = false

let shouldRecomposite = true
let shouldFullyRecomposite = true

let shouldShowCursor = true
let pixelInterpolation = InterpolationType.trilinear

function swapPixelInterpolation() {
  const gl = Application.gl

  const displayLayer = ResourceManager.get("DisplayLayer")

  // Swap to Nearest Neighbor mipmap interpolation when zoomed very closely
  if (Camera.zoom > 2.5) {
    if (pixelInterpolation !== InterpolationType.nearest) {
      gl.bindTexture(gl.TEXTURE_2D, displayLayer.bufferInfo?.textures[0])

      gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
      gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST)

      pixelInterpolation = InterpolationType.nearest
    }
  } else {
    if (pixelInterpolation !== InterpolationType.trilinear) {
      gl.bindTexture(gl.TEXTURE_2D, displayLayer.bufferInfo.textures[0])

      gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, Application.textureSupport.magFilterType)
      gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, Application.textureSupport.minFilterType)

      pixelInterpolation = InterpolationType.trilinear
    }
  }
}

function render() {
  const gl = Application.gl

  Application.resize(InputManager.resize)

  clearSpecific(framebuffers[readFramebuffer])
  clearSpecific(framebuffers[writeFramebuffer])

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

  swapPixelInterpolation()

  renderToScreen(ResourceManager.get("Background"), false)

  renderToScreen(ResourceManager.get("TransparencyGrid"), false, gridRenderUniforms)

  const displayLayer = ResourceManager.get("DisplayLayer")

  if (shouldRecomposite) {
    compositeLayers()

    scissorCanvas()
    blit(framebuffers[readFramebuffer], displayLayer, shouldFullyRecomposite ? undefined : strokeFrameBoundingBox)
    shouldFullyRecomposite = false
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  renderToScreen(displayLayer, true, renderUniforms)

  if (shouldShowCursor) {
    const usePressure = usePreferenceStore.getState().prefs.usePressure
    const pressure = usePressure ? PointerManager.pressure : 1
    Cursor.draw(gl, InteractionManager.currentMousePosition, pressure)
  }

  strokeFrameBoundingBox.reset()
}

function clearSpecific(renderInfo: RenderInfo, color?: Float32Array) {
  const gl = Application.gl

  gl.bindFramebuffer(gl.FRAMEBUFFER, renderInfo.bufferInfo.framebuffer)

  gl.viewport(0, 0, CanvasSizeCache.width, CanvasSizeCache.height)
  scissorCanvas()

  clear(color)
}

function viewportCanvas() {
  const gl = Application.gl

  gl.viewport(0, 0, Application.canvasInfo.width, Application.canvasInfo.height)
}

function scissorCanvas() {
  const gl = Application.gl

  gl.scissor(0, 0, Application.canvasInfo.width, Application.canvasInfo.height)
}

function scissorStrokeFrameSection() {
  const gl = Application.gl

  if (shouldFullyRecomposite) {
    gl.scissor(0, 0, Application.canvasInfo.width, Application.canvasInfo.height)
  } else {
    gl.scissor(
      strokeFrameBoundingBox.x,
      strokeFrameBoundingBox.y,
      strokeFrameBoundingBox.width + 1,
      strokeFrameBoundingBox.height + 1,
    )
  }
}

function compositeLayers() {
  const gl = Application.gl

  const intermediaryLayer = ResourceManager.get("IntermediaryLayer")
  const intermediaryLayer3 = ResourceManager.get("IntermediaryLayer3")
  const emptyLayer = ResourceManager.get("EmptyLayer")

  const currentTool = useToolStore.getState().currentTool
  const layerStorage = useLayerStore.getState().layerStorage

  const layers = useLayerStore.getState().layers
  const currentLayerID = useLayerStore.getState().currentLayer
  gl.useProgram(intermediaryLayer.programInfo?.program)
  gl.bindBuffer(gl.ARRAY_BUFFER, framebuffers[writeFramebuffer].programInfo?.VBO)
  gl.bindVertexArray(framebuffers[writeFramebuffer].programInfo?.VAO)

  viewportCanvas()
  scissorStrokeFrameSection()

  gl.disable(gl.BLEND)

  // Composite scratch layer with current layer into intermediaryLayer3
  const scratchLayer = ResourceManager.get("ScratchLayer")
  const currentLayer = ResourceManager.get(`Layer${currentLayerID}`)

  gl.bindFramebuffer(gl.FRAMEBUFFER, intermediaryLayer3.bufferInfo.framebuffer)
  viewportCanvas()
  scissorStrokeFrameSection()

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

  compositeLayer(scratchLayer.bufferInfo.textures[0], currentLayer.bufferInfo.textures[0])

  // Composite First layer against an empty texture
  const firstLayerID = layers[0]
  const firstLayer = layerStorage.get(firstLayerID)!
  const firsLayerResource = ResourceManager.get(`Layer${firstLayerID}`)

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[writeFramebuffer].bufferInfo.framebuffer)
  viewportCanvas()
  scissorStrokeFrameSection()

  gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, firstLayer.blendMode)
  gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, firstLayer.opacity / 100)

  if (firstLayer.id !== currentLayerID) {
    compositeLayer(firsLayerResource.bufferInfo.textures[0], emptyLayer.bufferInfo.textures[0])
  } else {
    compositeLayer(intermediaryLayer3.bufferInfo.textures[0], emptyLayer.bufferInfo.textures[0])

    clearSpecific(intermediaryLayer3)
  }

  readFramebuffer = Number(!readFramebuffer)
  writeFramebuffer = Number(!writeFramebuffer)

  // Layers above first layer
  for (let i = 1; i < layers.length; i++) {
    const layerID = layers[i]
    const layer = layerStorage.get(layerID)!
    const layerResource = ResourceManager.get(`Layer${layerID}`)

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[writeFramebuffer].bufferInfo.framebuffer)
    viewportCanvas()
    scissorStrokeFrameSection()

    gl.uniform1i(intermediaryLayer.programInfo.uniforms.u_blend_mode, layer.blendMode)
    gl.uniform1f(intermediaryLayer.programInfo.uniforms.u_opacity, layer.opacity / 100)

    if (layer.id !== currentLayerID) {
      compositeLayer(layerResource.bufferInfo.textures[0], framebuffers[readFramebuffer].bufferInfo.textures[0])
    } else {
      compositeLayer(intermediaryLayer3.bufferInfo.textures[0], framebuffers[readFramebuffer].bufferInfo.textures[0])

      clearSpecific(intermediaryLayer3)
    }

    readFramebuffer = Number(!readFramebuffer)
    writeFramebuffer = Number(!writeFramebuffer)
  }

  gl.enable(gl.BLEND)

  shouldRecomposite = false
}

function compositeLayer(top: WebGLTexture, bottom: WebGLTexture) {
  const gl = Application.gl

  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, top)
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, bottom)

  gl.drawArrays(gl.TRIANGLES, 0, 6)
}

function commitLayer(top: RenderInfo, bottom: RenderInfo, destination: RenderInfo) {
  const gl = Application.gl
  const intermediaryLayer3 = ResourceManager.get("IntermediaryLayer3")
  const currentTool = useToolStore.getState().currentTool

  gl.bindFramebuffer(gl.FRAMEBUFFER, intermediaryLayer3.bufferInfo.framebuffer)
  gl.useProgram(intermediaryLayer3.programInfo?.program)
  gl.bindBuffer(gl.ARRAY_BUFFER, intermediaryLayer3.programInfo?.VBO)
  gl.bindVertexArray(intermediaryLayer3.programInfo?.VAO)

  viewportCanvas()
  scissorCanvas()
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

  compositeLayer(top.bufferInfo.textures[0], bottom.bufferInfo.textures[0])

  blit(intermediaryLayer3, destination, scratchLayerBoundingBox)

  clearSpecific(intermediaryLayer3)

  gl.enable(gl.BLEND)
}

function blit(source: RenderInfo, destination: RenderInfo, area?: Box) {
  const gl = Application.gl

  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, source.bufferInfo?.framebuffer)
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, destination.bufferInfo?.framebuffer)

  if (area) {
    gl.blitFramebuffer(
      area.x,
      area.y,
      area.x + area.width,
      area.y + area.height,
      area.x,
      area.y,
      area.x + area.width,
      area.y + area.height,
      gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT,
      gl.NEAREST,
    )
  } else {
    gl.blitFramebuffer(
      0,
      0,
      Application.canvasInfo.width,
      Application.canvasInfo.height,
      0,
      0,
      Application.canvasInfo.width,
      Application.canvasInfo.height,
      gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT,
      gl.NEAREST,
    )
  }
}

function copy(source: WebGLFramebuffer, destination: WebGLTexture) {
  const gl = Application.gl

  gl.bindFramebuffer(gl.FRAMEBUFFER, source)
  gl.bindTexture(gl.TEXTURE_2D, destination)

  gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, Application.canvasInfo.width, Application.canvasInfo.height)
}

/**
 * Set up everything we need
 *
 * This should be called before starting the render loop
 */
function init() {
  const layers = useLayerStore.getState().layers
  const gl = Application.gl

  gl.enable(gl.SCISSOR_TEST)
  gl.enable(gl.BLEND)
  gl.enable(gl.DEPTH_TEST)

  gl.disable(gl.CULL_FACE)
  gl.disable(gl.RASTERIZER_DISCARD)
  gl.disable(gl.POLYGON_OFFSET_FILL)
  gl.disable(gl.DITHER)
  gl.disable(gl.STENCIL_TEST)
  gl.depthMask(false)

  gl.depthFunc(gl.LESS)

  gl.hint(gl.GENERATE_MIPMAP_HINT, gl.NICEST)

  ResourceManager.create(
    "TransparencyGrid",
    createTransparencyGrid(gl, Application.canvasInfo.width, Application.canvasInfo.height),
  )

  ResourceManager.create("Background", createFullscreenQuad(gl))

  ResourceManager.create(
    "ScratchLayer",
    createCanvasRenderTexture(
      gl,
      Application.canvasInfo.width,
      Application.canvasInfo.height,
      renderTextureFragment,
      renderTextureVertex,
      false,
    ),
  )

  ResourceManager.create(
    "EmptyLayer",
    createCanvasRenderTexture(
      gl,
      Application.canvasInfo.width,
      Application.canvasInfo.height,
      renderTextureFragment,
      renderTextureVertex,
      false,
    ),
  )

  ResourceManager.create(
    "DisplayLayer",
    createCanvasRenderTexture(
      gl,
      Application.canvasInfo.width,
      Application.canvasInfo.height,
      renderTextureFragment,
      renderTextureVertex,
      true,
    ),
  )

  const layerStorage = useLayerStore.getState().layerStorage

  for (const layerID of layers) {
    newLayer(layerStorage.get(layerID)!)
  }

  const currentLayerID = useLayerStore.getState().currentLayer
  const currentLayer = layerStorage.get(currentLayerID)!

  const currentLayerResource = ResourceManager.get(`Layer${currentLayerID}`)

  clearSpecific(currentLayerResource, white)
  currentLayer.calculateNewBoundingBox(
    0,
    Application.canvasInfo.height,
    Application.canvasInfo.width,
    Application.canvasInfo.height,
  )

  const intermediaryLayer = ResourceManager.create(
    "IntermediaryLayer",
    createCanvasRenderTexture(
      gl,
      Application.canvasInfo.width,
      Application.canvasInfo.height,
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
      Application.canvasInfo.width,
      Application.canvasInfo.height,
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
      Application.canvasInfo.width,
      Application.canvasInfo.height,
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
    vec2.fromValues(1 / (Application.canvasInfo.width / 2), 1 / (Application.canvasInfo.height / 2)),
  )

  mat3.translate(
    intermediaryLayer.data!.matrix!,
    intermediaryLayer.data!.matrix!,
    vec2.fromValues(-Application.canvasInfo.width / 2, -Application.canvasInfo.height / 2),
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
    vec2.fromValues(1 / (Application.canvasInfo.width / 2), 1 / (Application.canvasInfo.height / 2)),
  )

  mat3.translate(
    intermediaryLayer2.data!.matrix!,
    intermediaryLayer2.data!.matrix!,
    vec2.fromValues(-Application.canvasInfo.width / 2, -Application.canvasInfo.height / 2),
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
    vec2.fromValues(1 / (Application.canvasInfo.width / 2), 1 / (Application.canvasInfo.height / 2)),
  )

  mat3.translate(
    intermediaryLayer3.data!.matrix!,
    intermediaryLayer3.data!.matrix!,
    vec2.fromValues(-Application.canvasInfo.width / 2, -Application.canvasInfo.height / 2),
  )

  gl.useProgram(intermediaryLayer3.programInfo?.program)

  gl.uniform1i(intermediaryLayer3.programInfo?.uniforms.u_bottom_texture, 0)

  gl.uniform1i(intermediaryLayer3.programInfo?.uniforms.u_top_texture, 1)

  gl.uniformMatrix3fv(intermediaryLayer3.programInfo?.uniforms.u_matrix, false, intermediaryLayer3.data!.matrix!)

  Cursor.init(gl)

  framebuffers = [intermediaryLayer, intermediaryLayer2]
}

function newLayer(layer: Layer) {
  const gl = Application.gl

  ResourceManager.create(
    `Layer${layer.id}`,
    createCanvasRenderTexture(
      gl,
      Application.canvasInfo.width,
      Application.canvasInfo.height,
      renderTextureFragment,
      renderTextureVertex,
      false,
    ),
  )
}

function beginDraw() {
  needRedraw = true
  endDrawNextFrame = false
}

function pauseDrawNextFrame() {
  endDrawNextFrame = true
}

function start() {
  requestAnimationFrame(renderLoop)
}

function renderLoop() {
  if (needRedraw) {
    render()

    if (endDrawNextFrame) {
      needRedraw = false
      endDrawNextFrame = false
    }
  }
  requestAnimationFrame(renderLoop)
}

function recomposite() {
  shouldRecomposite = true
}

function fullyRecomposite() {
  recomposite()
  shouldFullyRecomposite = true
}

function hideCursor() {
  // shouldShowCursor = false
  Cursor.drawMode()
}

function disableCursor() {
  shouldShowCursor = false
}

function showCursor() {
  shouldShowCursor = true
  Cursor.hoverMode()
}

/**
 * Draw render texture to the canvas draw buffer
 */
function renderToScreen(
  renderInfo: RenderInfo,
  mipmap: boolean,
  setUniforms?: (gl: WebGL2RenderingContext, reference: RenderInfo) => void,
  overrides?: RenderInfo,
) {
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
function clear(color = transparent) {
  const gl = Application.gl

  gl.clearBufferfv(gl.COLOR, 0, color)
}

function clearAll() {
  for (const [_, resource] of ResourceManager.resources) {
    if (resource.bufferInfo?.framebuffer) {
      clearSpecific(resource)
    }
  }

  render()
}

// This is very slow for ARM processors when dealing with textures that may have inflight draw calls still going
function empty(texture: WebGLTexture) {
  const gl = Application.gl

  const emptyLayer = ResourceManager.get("EmptyLayer")

  gl.bindFramebuffer(gl.FRAMEBUFFER, emptyLayer.bufferInfo.framebuffer)
  gl.bindTexture(gl.TEXTURE_2D, texture)

  gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, Application.canvasInfo.width, Application.canvasInfo.height)
}

// TODO: Reimplement undo
function undo() {
  //   if (currentLayer.undoSnapshotQueue.length > 0 && currentOperation.points.length === 0) {
  //     currentLayer.redoSnapshotQueue.push(currentLayer.undoSnapshotQueue.pop())
  //   }
  //   endInteraction(false)
}

export const DrawingManager = {
  waitUntilInteractionEnd,
  empty,
  clearAll,
  commitLayer,
  clearSpecific,
  clear,
  showCursor,
  hideCursor,
  disableCursor,
  recomposite,
  fullyRecomposite,
  render,
  start,
  beginDraw,
  pauseDrawNextFrame,
  init,
  newLayer,
  undo,
  copy,
}
