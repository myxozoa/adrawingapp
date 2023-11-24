import { createContext } from "react"
import { LayerState as LayerStateType } from "../types"

const defaultValue: LayerStateType = { 
  layers: [],
  editingLayer: undefined
} as unknown as LayerStateType

export const LayerState = createContext(defaultValue)