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

export interface Point extends Location {
  pressure: number
  pointerType: PointerType
}
export type Points = Point[]
export interface IOperation {
  points: Points
  tool: AvailableTools
  readyToDraw: boolean
}
export type Operations = IOperation[]

export type PointerType = "mouse" | "pen" | "touch"
export interface MouseState extends Location {
  leftMouseDown: boolean
  rightMouseDown: boolean
  middleMouseDown: boolean
  pressure: number
  pointerType: PointerType
  inbounds?: boolean
}

export type Modifier = "ctrl" | "alt" | "shift"
export type ModifierState = Set<Modifier>

export interface UIInteraction {
  mouseState: MouseState
  modifierState: ModifierState
  wheelDeltaY: number
}

export type ToolType = "STROKE" | "POINT"
export type ToolName = "PEN" | "BRUSH" | "ERASER" | "FILL" | "EYEDROPPER"
export type ToolSetting = "size" | "color" | "opacity" | "hardness" | "flow" | "pressureOpacity" | "pressureSize"

export interface ITool {
  [index: string]: any
  name: ToolName
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean

  init: (gl: WebGL2RenderingContext) => void
}

export interface IBrush extends ITool {
  settings: {
    size: number
    flow: number
    opacity: number
    hardness: number
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

export interface IEraser extends ITool {
  settings: {
    size: number
    flow: number
    opacity: number
    hardness: number
    spacing: number
  }
  brush: IBrush

  base: (gl: WebGL2RenderingContext, operation: IOperation) => void
  draw: (gl: WebGL2RenderingContext, operation: IOperation) => void
}

export type EyeDropperSampleSizes = "1x1" | "2x2" | "3x3"

export interface IEyedropper extends ITool {
  settings: {
    sampleSize: EyeDropperSampleSizes
  }

  use: (gl: WebGL2RenderingContext, operation: IOperation) => void
}

export type AvailableTools = IBrush | IPen | IFill | IEyedropper | IEraser

export type BlendModes =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity"

export type LayerName = string
export type LayerID = string
export interface ILayer {
  blendMode: BlendModes
  name: LayerName
  id: LayerID
  redoSnapshotQueue: Float32Array[]
  undoSnapshotQueue: Float32Array[]
  drawingData: Float32Array
  noDraw: boolean
  size: Size
  boundingBox: Box
  // saveAndStartNewOperation(): void
  // getImageData(): ImageData
  // addElementToUndoSnapshotQueue(image: ImageData): void
  // replaceDrawingData(image: ImageData): void
  // fill(color?: ColorValueString): void
}
