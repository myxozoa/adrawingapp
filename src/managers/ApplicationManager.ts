import { initializeCanvas, resizeCanvasToDisplaySize } from "@/utils"

import { DrawingManager } from "@/managers/DrawingManager"
import { InputManager } from "@/managers/InputManager"

import { tools } from "@/stores/ToolStore.ts"
import { Camera } from "@/objects/Camera"
import { Operation } from "@/objects/Operation.ts"

import { usePreferenceStore } from "@/stores/PreferenceStore"

import { ILayer, IOperation, AvailableTools } from "@/types.ts"

interface SupportedExtensions {
  colorBufferFloat: EXT_color_buffer_float | null
  floatBlend: EXT_float_blend | null
  textureFloat: OES_texture_float | null
  textureFloatLinear: OES_texture_float_linear | null
  textureHalfFloat: OES_texture_float | null
  textureHalfFloatLinear: OES_texture_half_float_linear | null
  colorBufferHalfFloat: EXT_color_buffer_half_float | null
}

interface SupportedTextureInfo {
  pixelType: number
  imageFormat: number
  magFilterType: number
  minFilterType: number
}

interface SystemConstraints {
  maxTextureSize: number
  maxTextureImageUnits: number
  maxRenderBufferSize: number
  maxDrawBuffers: number
  maxColorAttachments: number
  maxSamples: number
}

class _Application {
  offscreenCanvas: OffscreenCanvas
  gl: WebGL2RenderingContext

  currentLayer: ILayer
  currentTool: AvailableTools
  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>

  extensions: SupportedExtensions
  textureSupport: SupportedTextureInfo
  systemConstraints: SystemConstraints

  exportCanvas: OffscreenCanvas
  exportCanvasContext: ImageBitmapRenderingContext
  exportDownloadLink: HTMLAnchorElement

  drawing: boolean

  constructor() {
    this.gl = {} as WebGL2RenderingContext
    this.currentLayer = {} as ILayer
    this.currentTool = {} as AvailableTools
    this.currentOperation = {} as Operation
    this.extensions = {
      colorBufferFloat: null,
      floatBlend: null,
      textureFloat: null,
      textureFloatLinear: null,
      textureHalfFloat: null,
      textureHalfFloatLinear: null,
      colorBufferHalfFloat: null,
    }
    this.systemConstraints = {
      maxTextureSize: 0,
      maxTextureImageUnits: 0,
      maxRenderBufferSize: 0,
      maxDrawBuffers: 0,
      maxColorAttachments: 0,
      maxSamples: 0,
    }
    this.textureSupport = { pixelType: 0, imageFormat: 0, magFilterType: 0, minFilterType: 0 }
    this.drawing = false
  }

  private getExtensions = () => {
    const gl = this.gl
    // WebGL2 Float textures are supported by default
    this.extensions.textureFloat = gl.getExtension("OES_texture_float")
    this.extensions.colorBufferFloat = gl.getExtension("EXT_color_buffer_float")

    // Firefox will give an implicit enable warning if EXT_float_blend is enabled before
    // EXT_color_buffer_float because the implicit EXT_color_buffer_float overrides it.
    // this is not supported on iOS
    this.extensions.floatBlend = gl.getExtension("EXT_float_blend")
    this.extensions.textureFloatLinear = gl.getExtension("OES_texture_float_linear")
    this.extensions.textureHalfFloat = gl.getExtension("OES_texture_half_float")
    this.extensions.textureHalfFloatLinear = gl.getExtension("OES_texture_half_float_linear")
    this.extensions.colorBufferHalfFloat = gl.getExtension("EXT_color_buffer_half_float")
  }

  private getSystemConstraints = () => {
    const gl = this.gl

    this.systemConstraints.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
    this.systemConstraints.maxTextureImageUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number
    this.systemConstraints.maxRenderBufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number
    this.systemConstraints.maxDrawBuffers = gl.getParameter(gl.MAX_DRAW_BUFFERS) as number
    this.systemConstraints.maxColorAttachments = gl.getParameter(gl.MAX_COLOR_ATTACHMENTS) as number
    this.systemConstraints.maxSamples = gl.getParameter(gl.MAX_SAMPLES) as number
  }

  private getSupportedTextureInfo = () => {
    const gl = this.gl
    // halfFloatTextureExt && halfFloatColorBufferExt seem to be null on iPadOS 17+

    this.textureSupport.pixelType = gl.HALF_FLOAT
    this.textureSupport.imageFormat = this.extensions.colorBufferHalfFloat?.RGBA16F_EXT || gl.RGBA16F

    // Feature detecting  float texture linear filtering on iOS / iPadOS seems to not work at all
    // TODO: Figure out what to do
    this.textureSupport.minFilterType = gl.LINEAR_MIPMAP_LINEAR
    this.textureSupport.magFilterType = gl.LINEAR
    // this.textureSupport.minFilterType =
    //   floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST
    // this.textureSupport.magFilterType = floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR : gl.NEAREST
  }

  public swapTool = (tool: AvailableTools) => {
    this.currentTool = tool
    this.currentOperation.reset()
    this.currentOperation.swapTool(tool)
  }

  public createCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
    const context = initializeCanvas(canvas, width, height, {
      resize: true,
    })

    this.gl = context
  }

  public resize = () => {
    resizeCanvasToDisplaySize(this.gl.canvas as HTMLCanvasElement)
  }

  public init = () => {
    const gl = this.gl
    const prefs = usePreferenceStore.getState().prefs

    this.getExtensions()
    this.getSupportedTextureInfo()
    this.getSystemConstraints()

    DrawingManager.init()
    InputManager.init()

    this.currentOperation = new Operation(this.currentTool)

    this.resize()

    this.exportCanvas = new OffscreenCanvas(prefs.canvasWidth, prefs.canvasHeight)
    this.exportCanvasContext = this.exportCanvas.getContext("bitmaprenderer")!

    this.exportDownloadLink = document.createElementNS("http://www.w3.org/1999/xhtml", "a") as HTMLAnchorElement
    this.exportDownloadLink.id = "local_filesaver"
    this.exportDownloadLink.target = "_blank"
    this.exportDownloadLink.rel = "noopener"
    this.exportDownloadLink.style.display = "none"
    document.body.appendChild(this.exportDownloadLink)

    Camera.init()

    // Initialize tools
    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })

    DrawingManager.start()
  }

  public destroy = () => {
    InputManager.destroy()
  }
}

export const Application = new _Application()

if (import.meta.env.DEV) {
  // @ts-expect-error Adding global for debugging purposes
  window.__Application = Application
}
