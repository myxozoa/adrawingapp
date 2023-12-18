export type Nullable<T> = T | null
export type Maybe<T> = T | undefined

export type HexColor = string
export type ColorValue = number
export type ColorValueString = string
export type ColorArray = [number, number, number]

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
  tool: Tool,
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
  size: number
  opacity: number
  hardness: number
  availableSettings: ToolSetting[]
  type: ToolType
  continuous: boolean
  image?: Nullable<HTMLImageElement>
}

export interface ToolState { 
  tools: Record<ToolName, Tool>
  currentTool: Tool
  toolSize: number
  toolHardness: number
  toolOpacity: number
  toolSpacing: number
  setCurrentTool: (name: ToolName) => void
  setToolSize: React.Dispatch<React.SetStateAction<number>>
  setToolHardness: React.Dispatch<React.SetStateAction<number>>
  setToolOpacity: React.Dispatch<React.SetStateAction<number>>
  setToolSpacing: React.Dispatch<React.SetStateAction<number>>
  changeToolSetting: (newSettings: any) => void
}

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
export interface LayerState {
  layers: ILayer[]
  setLayers: React.Dispatch<React.SetStateAction<ILayer[]>>
  currentLayer: ILayer
  setCurrentLayer: (id: LayerID) => void
  newLayer: () => void
  removeLayer: () => void
  saveNewName: (id: LayerID, name: LayerName) => void
  editingLayer: number
  setEditingLayer: React.Dispatch<React.SetStateAction<number>>
}

export interface MainStateType { 
  color: ColorArray
  changeSetting: (newSettings: any) => void
}