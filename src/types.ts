import { vec2, mat3 } from "gl-matrix"

export type Nullable<T> = T | null
export type Maybe<T> = T | undefined
export type ValueOf<T> = T[keyof T]
export type NonMethodKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]
export type WithoutMethods<T> = Pick<T, NonMethodKeys<T>>

export type HexColor = string
export type ColorValue = number
export type ColorValueString = string
export type ColorArray = [ColorValue, ColorValue, ColorValue]

export interface Size {
  width: number
  height: number
}

export interface Location {
  x: number
  y: number
}

export type Box = Size & Location

export interface IPoint extends Location {
  location: vec2
  pressure: number
  pointerType: PointerType
  active: boolean
  id: number

  reset: () => void
  copy: (point: IPoint) => void
}

export interface IPoints {
  list: IPoint[]
  currentPointIndex: number
  currentPoint: IPoint
  length: number
  at: (index: number) => IPoint | undefined
  getPoint: (index: number) => IPoint
  updatePoint: (index: number, newInfo: Exclude<Partial<IPoint>, "location"> | null, x?: number, y?: number) => void
  updateCurrentPoint: (newInfo: Exclude<Partial<IPoint>, "location"> | null, x?: number, y?: number) => void
  nextPoint: () => void
  prevPoint: () => void
  reset: () => void
}

export interface IOperation {
  points: IPoints
  tool: AvailableTools
  readyToDraw: boolean
  drawnPoints: number

  reset: () => void
  addDrawnPoints: (number?: number) => void
  swapTool: (tool: AvailableTools) => void
}
export type Operations = IOperation[]

export type PointerType = "mouse" | "pen" | "touch"
export interface MouseState extends Location {
  leftMouseDown: boolean
  rightMouseDown: boolean
  middleMouseDown: boolean
  pressure: number
  pointerType: PointerType
}

export type Modifier = "ctrl" | "alt" | "shift" | "space"
export type ModifierState = Set<Modifier>

export interface WheelState {
  wheel: number
}

export interface UIInteraction {
  mouseState: MouseState
  modifierState: ModifierState
  wheelState: WheelState
}

export type ToolType = "STROKE" | "POINT"
export type ToolName = /*"PEN" | */ "BRUSH" | "ERASER" | "FILL" | "EYEDROPPER"
export type ToolSetting = "size" | "color" | "opacity" | "hardness" | "flow" | "pressureOpacity" | "pressureSize"

export interface ITool {
  [index: string]: any
  name: ToolName
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean
  numberOfPoints: number

  init: (gl: WebGL2RenderingContext) => void
  reset: () => void
  end: () => void
}

export interface IBrush extends ITool {
  settings: {
    size: number
    sizePressure: boolean
    flow: number
    flowPressure: boolean
    opacity: number
    opacityPressure: boolean
    hardness: number
    hardnessPressure: boolean
    spacing: number
  }

  switchTo: (gl: WebGL2RenderingContext) => void
  draw: (gl: WebGL2RenderingContext, operation: IOperation) => void
}

export interface IPen extends ITool {
  settings: {
    size: number
    opacity: number
  }
}

export interface IFill extends ITool {
  settings: {
    flood: boolean
  }

  use: (gl: WebGL2RenderingContext, operation: IOperation) => void
}

export type IEraser = IBrush

export type EyeDropperSampleSizes = 1 | 3 | 5

export interface IEyedropper extends ITool {
  settings: {
    sampleSize: EyeDropperSampleSizes
  }

  use: (gl: WebGL2RenderingContext, operation: IOperation) => void
}

export type AvailableTools = IBrush | IPen | IFill | IEyedropper

export type LayerName = string
export type LayerID = string
export interface ILayer {
  blendMode: number
  clippingMask: boolean
  name: LayerName
  id: LayerID
  redoSnapshotQueue: Float32Array[]
  undoSnapshotQueue: Float32Array[]
  noDraw: boolean
  boundingBox: Box
  // saveAndStartNewOperation(): void
  // getImageData(): ImageData
  // addElementToUndoSnapshotQueue(image: ImageData): void
  // replaceDrawingData(image: ImageData): void
  // fill(color?: ColorValueString): void
}

// Don't know if this can be done any other way but I cannot stand it
// Guess I'll just add everything that might be needed in here
export interface PossibleData {
  matrix?: mat3
}

export interface ProgramInfo {
  program: Nullable<WebGLProgram>
  uniforms: Record<string, WebGLUniformLocation>
  attributes: Record<string, GLint>
  VBO: Nullable<WebGLBuffer>
  VAO: Nullable<WebGLBuffer>
}

export interface BufferInfo {
  textures: WebGLTexture[]
  framebuffer: Nullable<WebGLFramebuffer>
}

export interface RenderInfo {
  programInfo: ProgramInfo
  bufferInfo: BufferInfo
  data?: PossibleData
}

export type ExportImageFormatsMIME = "image/png" | "image/jpeg" | "image/webp" | "image/bmp"
export type ExportImageFormats = "png" | "jpeg" | "webp" | "bmp"

export interface IThumbnailConfig {
  type: "CONFIG"
  thumbnailWidth: number
  thumbnailHeight: number
}

export interface IThumbnailRequest {
  type: "REQUEST"
  pixelBuffer: ArrayBuffer
  colorDepth: 8 | 16
  layerID: string
}

export interface IThumbnailResponse {
  type: "COMPLETE"
  pixelBuffer: ArrayBuffer
  imageURL: string
  layerID: string
}

export interface IAppMessageResponseEvent extends MessageEvent {
  data: IThumbnailResponse
}

export interface IAppMessageDebugLogEvent extends MessageEvent {
  data: {
    type: "DEBUG_LOG"
    msg: string
  }
}

export interface IAppMessageRequestEvent extends MessageEvent {
  data: IThumbnailRequest
}

export interface IAppMessageConfigEvent extends MessageEvent {
  data: IThumbnailConfig
}
