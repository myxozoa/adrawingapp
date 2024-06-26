import { initializeCanvas, resizeCanvasToDisplaySize, resizeObserver } from "@/utils/utils"
import { getMIMEFromImageExtension } from "@/utils/sharedUtils"

import { DrawingManager, scratchLayerBoundingBox, strokeFrameBoundingBox } from "@/managers/DrawingManager"
import { InputManager } from "@/managers/InputManager"

import { tools, useToolStore } from "@/stores/ToolStore"
import { Camera } from "@/objects/Camera"
import { Operation } from "@/objects/Operation"

import { getPreference } from "@/stores/PreferenceStore"

import { ModifierKeyManager } from "@/managers/ModifierKeyManager"

import type { IOperation, AvailableTools, ExportImageFormats } from "@/types"
import { ResourceManager } from "@/managers/ResourceManager"
import { getLayer, useLayerStore } from "@/stores/LayerStore"
import { resetPointerManager } from "@/managers/PointerManager"
import { InteractionManager } from "@/managers/InteractionManager"

import { ThumbnailController } from "@/managers/ThumbnailController"

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

interface ThumbnailSize {
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

  exportDownloadLink: HTMLAnchorElement

  supportedExportImageFormats: ExportImageFormats[]

  canvasInfo: CanvasInfo

  thumbnailSize: ThumbnailSize
  thumbnailWorker: ThumbnailController

  supportsOPFS: boolean

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

    this.canvasInfo = {
      width: 0,
      height: 0,
    }

    this.thumbnailSize = {
      width: 0,
      height: 0,
    }

    this.textureSupport = { pixelType: 0, imageFormat: 0, magFilterType: 0, minFilterType: 0 }
    this.drawing = false

    this.supportedExportImageFormats = ["png"]

    this.initialized = false

    this.supportsOPFS = true

    this.thumbnailWorker = new ThumbnailController()
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

  public resize = (callback?: () => void) => {
    resizeCanvasToDisplaySize(this.gl.canvas, callback)
  }

  public init = () => {
    InputManager.init()
    ModifierKeyManager.init()

    if (this.initialized) return

    const gl = this.gl

    this.canvasInfo = {
      width: getPreference("canvasWidth"),
      height: getPreference("canvasHeight"),
    }

    // Thumbnail should fit inside a 50x50 box if this ends up larger than the canvas, use the canvas size
    const scaleFactor = Math.max(Application.canvasInfo.width, Application.canvasInfo.height) / 50
    this.thumbnailSize = {
      width: Math.min(
        Math.max(Math.round(Application.canvasInfo.width / scaleFactor), 1),
        Application.canvasInfo.width,
      ),
      height: Math.min(
        Math.max(Math.round(Application.canvasInfo.height / scaleFactor), 1),
        Application.canvasInfo.height,
      ),
    }

    this.thumbnailWorker.config(this.thumbnailSize)

    this.getSupportedExportImageTypes()

    this.getExtensions()
    this.getSupportedTextureInfo(getPreference("colorDepth"))
    this.getSystemConstraints()

    const currentTool = useToolStore.getState().currentTool

    this.currentOperation = new Operation(currentTool)

    this.exportDownloadLink = document.getElementById("local_filesaver")! as HTMLAnchorElement

    // Initialize tools
    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })

    // Set these bounding boxes to the size of the canvas initially so everything draws
    // in the beginning before any brush interactions happen. Interactions will set them to the proper size
    scratchLayerBoundingBox._set(0, 0, this.canvasInfo.width, this.canvasInfo.height)
    strokeFrameBoundingBox._set(0, 0, this.canvasInfo.width, this.canvasInfo.height)

    const layers = useLayerStore.getState().layers
    const getOPFSSuport = async () => {
      try {
        await navigator.storage.getDirectory()
      } catch (error) {
        this.supportsOPFS = false
      }
    }

    getOPFSSuport()
      .then(() => {
        const layerThumbnailSetup = []

        for (const layerID of layers) {
          const layer = getLayer(layerID)
          if (layer === undefined) throw new Error(`Layer ${layerID} not found`)

          layer.setupThumbnail()

          layerThumbnailSetup.push(
            this.thumbnailWorker.getNewThumbnail(layer.thumbnailBuffer.buffer, getPreference("colorDepth"), layer.id),
          )
        }

        Promise.all(layerThumbnailSetup)
          .then(() => {
            this.resize()

            Camera.init()

            DrawingManager.init()

            DrawingManager.start()

            this.initialized = true
          })
          .catch((error) => console.error(error))
      })
      .catch((error) => console.error(error))
  }

  public destroy = () => {
    if (!this.initialized) return

    useLayerStore.getState().deleteAll()
    ResourceManager.deleteAll()

    Camera.reset()
    DrawingManager.reset()
    InteractionManager.reset()
    ModifierKeyManager.reset()
    resetPointerManager()

    for (const tool of Object.values(tools)) {
      tool.reset()
    }

    this.currentOperation.reset()

    InputManager.destroy()
    resizeObserver.disconnect()

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
    this.canvasInfo = {
      width: 0,
      height: 0,
    }
    this.thumbnailSize = {
      width: 0,
      height: 0,
    }
    this.textureSupport = { pixelType: 0, imageFormat: 0, magFilterType: 0, minFilterType: 0 }
    this.drawing = false

    this.supportedExportImageFormats = ["png"]

    this.initialized = false
  }
}

export const Application = new _Application()

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  // @ts-expect-error Adding global for debugging purposes
  window.__Application = Application
}
