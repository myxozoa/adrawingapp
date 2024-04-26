import { initializeCanvas, resizeCanvasToDisplaySize } from "@/utils"

import { DrawingManager } from "@/managers/DrawingManager"
import { InputManager } from "@/managers/InputManager"

import { tools } from "@/stores/ToolStore.ts"
import { Camera } from "@/objects/Camera"
import { Operation } from "@/objects/Operation.ts"

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

class _Application {
  offscreenCanvas: OffscreenCanvas
  gl: WebGL2RenderingContext

  currentLayer: ILayer
  currentTool: AvailableTools
  currentOperation: IOperation
  toolBelt: Record<string, (operation: IOperation) => void>

  extensions: SupportedExtensions
  textureSupport: SupportedTextureInfo

  constructor() {
    this.gl = {} as WebGL2RenderingContext
    this.currentLayer = {} as ILayer
    this.currentTool = {} as AvailableTools
    this.currentOperation = {} as Operation
    this.extensions = {} as SupportedExtensions
    this.textureSupport = {} as SupportedTextureInfo
  }

  private getExtensions = () => {
    const gl = this.gl
    // WebGL2 Float textures are supported by default
    this.extensions.colorBufferFloat = gl.getExtension("EXT_color_buffer_float")

    // Firefox will give an implicit enable warning if EXT_float_blend is enabled before
    // EXT_color_buffer_float because the implicit EXT_color_buffer_float overrides it.
    // this is not supported on iOS
    this.extensions.floatBlend = gl.getExtension("EXT_float_blend")
    this.extensions.textureFloat = gl.getExtension("OES_texture_float") // Only needed for 32bit?
    this.extensions.textureFloatLinear = gl.getExtension("OES_texture_float_linear")
    this.extensions.textureHalfFloat = gl.getExtension("OES_texture_half_float")
    this.extensions.textureHalfFloatLinear = gl.getExtension("OES_texture_half_float_linear")
    this.extensions.colorBufferHalfFloat = gl.getExtension("EXT_color_buffer_half_float")
  }

  private getSupportedTextureInfo = () => {
    const gl = this.gl
    // halfFloatTextureExt && halfFloatColorBufferExt seem to be null on iPadOS 17+
    // Not sure what devices will need these then

    this.textureSupport.pixelType = gl.FLOAT
    this.textureSupport.imageFormat = gl.RGBA16F

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
    }) as WebGL2RenderingContext

    this.gl = context
  }

  public resize = () => {
    resizeCanvasToDisplaySize(this.gl.canvas as HTMLCanvasElement)
  }

  public init = () => {
    const gl = this.gl

    this.getExtensions()
    this.getSupportedTextureInfo()

    DrawingManager.init()
    InputManager.init()

    this.currentOperation = new Operation(this.currentTool)

    this.resize()

    Camera.init(gl)

    // Initialize tools
    Object.values(tools).forEach((tool) => {
      if (tool.init) tool.init(gl)
    })

    DrawingManager.swapPixelInterpolation()

    DrawingManager.start()
  }

  public destroy = () => {
    InputManager.destroy()
  }
}

export const Application = new _Application()
