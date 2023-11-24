import { createContext } from "react"

const defaultValue = { 
  layers: [],
  setLayers: () => {},
  currentLayer: 0,
  setCurrentLayer: () => {},
  newLayer: () => {},
  removeLayer: () => {},
  saveNewName: () => {},
  editingLayer: undefined,
  setEditingLayer: () => {}
}

export const LayerState = createContext(defaultValue)