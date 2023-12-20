export type Nullable<T> = T | null
export type Maybe<T> = T | undefined

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

export interface Point extends Location { pressure: number, pointerType: PointerType, drawn?: boolean }
export type Points = Point[]
export interface IOperation {
  points: Points,
  tool: AvailableTools,
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

export interface UIInteraction { mouseState: MouseState, modifierState: ModifierState, wheelDeltaY: number }

export type ToolType = "STROKE" | "POINT"
export type ToolName = "PEN" | "BRUSH" | "ERASER" | "FILL" /*| "CURVE" */
export type ToolSetting = "size" | "color" | "opacity" | "hardness" | "flow" | "pressureOpacity" | "pressureSize"

export interface ITool {
  [index: string] : any
  name: ToolName
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean
}

export interface IBrush extends ITool {
  size: number
  flow: number
  opacity: number
  hardness: number
  spacing: number
}

export interface IPen extends ITool {
  size: number
  opacity: number
}

export interface IFill extends ITool {
  flood: boolean
}

export type AvailableTools = IBrush | IPen | IFill

export type BlendModes = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity"

export type LayerName = string
export type LayerID = string
export interface ILayer {
  blendMode: BlendModes
  name: LayerName
  id: LayerID
  canvasRef: React.MutableRefObject<HTMLCanvasElement>
  currentOperation: IOperation
  undoSnapshotQueue: ImageData[]
  drawingData: ImageData
  noDraw: boolean
  size: Size
  boundingBox: Box
  saveAndStartNewOperation(): void
  getImageData(): ImageData
  addElementToUndoSnapshotQueue(image: ImageData): void
  replaceDrawingData(image: ImageData): void
  fill(color?: ColorValueString): void
}
