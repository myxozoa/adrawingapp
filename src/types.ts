export type Nullable<T> = T | null
export type Maybe<T> = T | undefined

export type HexColor = string
export type ColorValue = number
export type ColorValueString = string
export type ColorArray = [number, number, number]

export interface Point { x: number, y: number, pressure: number, pointerType: PointerType }
export type Points = Point[]
export interface Operation { points: Points, tool: Tool }
export type Operations = Operation[]

export type PointerType = "mouse" | "pen" | "touch"
export interface MouseState { 
  x: number
  y: number
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

export type ToolName = "PEN" | "BRUSH" | "ERASER" /*| "CURVE" */
export type ToolSetting = "size" | "color" | "opacity" | "hardness" | "flow" | "pressureOpacity" | "pressureSize"
export interface Tool {
  [index: string] : any
  name: ToolName
  size: number
  color: ColorArray
  opacity: number
  hardness: number
  availableSettings: ToolSetting[]
  getCanvasColor: (opacity?: boolean, fullyTransparent?: boolean) => HexColor
  image?: Nullable<HTMLImageElement>
}

export interface ToolState { 
  tools: Record<ToolName, Tool>
  currentTool: Tool
  setCurrentTool: (name: ToolName) => void
  changeToolSetting: (newSettings: Partial<Tool>) => void
}

export type BlendModes = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color-dodge" | "color-burn" | "hard-light" | "soft-light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity"

export type LayerName = string
export type LayerID = number
export interface ILayer {
  blendMode: BlendModes
  name: LayerName
  id: LayerID
  canvasRef: React.MutableRefObject<HTMLCanvasElement>
  currentOperation: Operation
  undoQueue: ImageData[]
  rasterizedEvents: ImageData
  noDraw: boolean
  newElement(): void
  rasterizeElement(): ImageData
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
