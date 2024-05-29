import { getMIMEFromImageExtension, initializeCanvas, resizeCanvasToDisplaySize } from "@/utils/utils"

import { DrawingManager } from "@/managers/DrawingManager"
import { InputManager } from "@/managers/InputManager"

import { tools, useToolStore } from "@/stores/ToolStore"
import { Camera } from "@/objects/Camera"
import { Operation } from "@/objects/Operation"

import { usePreferenceStore } from "@/stores/PreferenceStore"

import type { IOperation, AvailableTools, ExportImageFormats } from "@/types"

interface SupportedExtensions {
  colorBufferFloat: EXT_color_buffer_float | null
  floatBlend: EXT_float_blend | null
  textureFloat: OES_texture_float | null
  textureFloatLinear: OES_texture_float_linear | null
  textureHalfFloat: OES_texture_float | null
  textureHalfFloatLinear: OES_texture_half_float_linear | null
  colorBufferHalfFloat: EXT_color_buffer_half_float | null
  // @ts-expect-error This is a real ext
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  provokingVertex: WEBGL_provoking_vertex | null
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

interface CanvasInfo {
  width: number
  height: number
}

interface WebGL2RenderingContextDOM extends Omit<WebGL2RenderingContext, "canvas"> {
  canvas: HTMLCanvasElement
}

class _Application {
  offscreenCanvas: OffscreenCanvas
  gl: WebGL2RenderingContextDOM

  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>

  extensions: SupportedExtensions
  textureSupport: SupportedTextureInfo
  systemConstraints: SystemConstraints

  exportCanvas: OffscreenCanvas
  exportCanvasContext: ImageBitmapRenderingContext
  exportDownloadLink: HTMLAnchorElement

  supportedExportImageFormats: ExportImageFormats[]

  canvasInfo: CanvasInfo

  initialized: boolean
  drawing: boolean

  constructor() {
    this.gl = {} as WebGL2RenderingContextDOM
    this.currentOperation = {} as Operation
    this.extensions = {
      colorBufferFloat: null,
      floatBlend: null,
      textureFloat: null,
      textureFloatLinear: null,
      textureHalfFloat: null,
      textureHalfFloatLinear: null,
      colorBufferHalfFloat: null,
      provokingVertex: null,
    }
    this.systemConstraints = {
      maxTextureSize: 0,
      maxTextureImageUnits: 0,
      maxRenderBufferSize: 0,
      maxDrawBuffers: 0,
      maxColorAttachments: 0,
      maxSamples: 0,
    }

    const prefs = usePreferenceStore.getState().prefs

    this.canvasInfo = {
      width: prefs.canvasWidth,
      height: prefs.canvasHeight,
    }
    this.textureSupport = { pixelType: 0, imageFormat: 0, magFilterType: 0, minFilterType: 0 }
    this.drawing = false

    this.supportedExportImageFormats = ["png"]

    this.initialized = false
  }

  private getSupportedExportImageTypes = () => {
    // Browsers are required to support PNG but not necessarily anything else
    // so we don't need to check png
    const possibleImageFormats: ExportImageFormats[] = ["jpeg", "webp", "bmp"]
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = 1
    tempCanvas.height = 1

    for (const format of possibleImageFormats) {
      const formatMIME = getMIMEFromImageExtension(format)
      const dataURL = tempCanvas.toDataURL(formatMIME, 1.0)

      if (dataURL.startsWith(`data:${formatMIME}`)) {
        this.supportedExportImageFormats.push(format)
      }

      URL.revokeObjectURL(dataURL)
    }

    tempCanvas.remove()
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.extensions.provokingVertex = gl.getExtension("WEBGL_provoking_vertex")

    if (this.extensions.provokingVertex) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.extensions.provokingVertex.provokingVertexWEBGL(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.extensions.provokingVertex.FIRST_VERTEX_CONVENTION_WEBGL,
      )
    }
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

  private getSupportedTextureInfo = (bitDepth: 8 | 16) => {
    const gl = this.gl
    // halfFloatTextureExt && halfFloatColorBufferExt seem to be null on iPadOS 17+

    if (bitDepth === 16) {
      this.textureSupport.pixelType = gl.HALF_FLOAT
      this.textureSupport.imageFormat = this.extensions.colorBufferHalfFloat?.RGBA16F_EXT || gl.RGBA16F
    }

    if (bitDepth === 8) {
      this.textureSupport.pixelType = gl.UNSIGNED_BYTE
      this.textureSupport.imageFormat = gl.RGBA8
    }

    // Feature detecting  float texture linear filtering on iOS / iPadOS seems to not work at all
    // TODO: Figure out what to do
    this.textureSupport.minFilterType = gl.LINEAR_MIPMAP_LINEAR
    this.textureSupport.magFilterType = gl.LINEAR
    // this.textureSupport.minFilterType =
    //   floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR_MIPMAP_LINEAR : gl.NEAREST_MIPMAP_NEAREST
    // this.textureSupport.magFilterType = floatTextureLinearExt || halfFloatTextureLinearExt ? gl.LINEAR : gl.NEAREST
  }

  public swapTool = (tool: AvailableTools) => {
    this.currentOperation.reset()
    this.currentOperation.swapTool(tool)
  }

  public createCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
    if (this.initialized) return

    const context = initializeCanvas(canvas, width, height, {
      resize: true,
    })

    this.gl = context as WebGL2RenderingContextDOM
  }

  public resize = () => {
    resizeCanvasToDisplaySize(this.gl.canvas)
  }

  public init = () => {
    InputManager.init()

    if (this.initialized) return

    const gl = this.gl

    this.getSupportedExportImageTypes()

    this.getExtensions()
    this.getSupportedTextureInfo(16)
    this.getSystemConstraints()

    const currentTool = useToolStore.getState().currentTool

    this.currentOperation = new Operation(currentTool)

    this.resize()

    DrawingManager.init()

    this.exportCanvas = new OffscreenCanvas(this.canvasInfo.width, this.canvasInfo.height)
    this.exportCanvasContext = this.exportCanvas.getContext("bitmaprenderer")!

    if (!this.exportCanvasContext) throw new Error("unable to get exportcanvas context")

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

    this.initialized = true

    DrawingManager.start()
  }

  public destroy = () => {
    InputManager.destroy()
  }
}

export const Application = new _Application()

if (process.env.NODE_ENV !== "production") {
  // @ts-expect-error Adding global for debugging purposes
  window.__Application = Application
}
