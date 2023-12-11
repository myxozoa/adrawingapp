import { create } from 'zustand'
import { Layer as LayerType, LayerID, LayerName } from '../types'

import { Layer } from '../objects/Layer'

import { createSelectors } from './selectors'

type State = {
  layers: LayerType[]
  currentLayer: LayerType
  editingLayer: number
}

type Action = {
  setLayers: (layers: layer[]) => void
  _setCurrentLayer: (layer: LayerType) => void
  setEditingLayer: (index: number) => void
  setCurrentLayer: (id: LayerID) => void
  newLayer: () => void
  removeLayer: () => void
  setCurrentLayer: (id: LayerID) => void
  saveNewName: (id: LayerID, name: LayerName) => void
  keepCurrentLayerInSync: () => void
}

const baseLayer = new Layer("New Layer")

let currentLayerIndex = 0

const useLayerStoreBase = create<State & Action>((set) => ({
  layers: [baseLayer],
  currentLayer: baseLayer,
  editingLayer: 0,
  keepCurrentLayerInSync: () => set((state) => {
    const currentLayerExists = state.layers.find((layer) => layer.id === state.currentLayer.id)

    if (!currentLayerExists) {

      if (currentLayerIndex > state.layers.length - 1) {
        currentLayerIndex = state.layers.length - 1
      }
      state.setCurrentLayer(state.layers[currentLayerIndex].id)
    }
  }),
  setLayers: (layers: LayerType[]) => set(() => ({
    layers
  })),
  _setCurrentLayer: (layer: LayerType) => set(() => ({
    currentLayer: layer
  })),
  setEditingLayer: (index: number) => set(() => ({
    editingLayer: index
  })),
  newLayer: () => set((state) => {
    if (state.layers.length > 9) return

    const newLayer = new Layer(`New Layer (${state.layers.length})`)
    currentLayerIndex = 0

    return { currentLayer: newLayer, layers: [newLayer, ...state.layers] }
  }),
  removeLayer: () => set((state) => {
    if (state.currentLayer && state.layers.length && state.layers.length > 1) {

      const newLayers = [...state.layers].filter((layer) => {
        return layer.id !== state.currentLayer.id
      })

      if (currentLayerIndex > newLayers.length - 1) {
        currentLayerIndex = newLayers.length - 1
      }

      return { layers: newLayers, currentLayer: newLayers[currentLayerIndex] }
    }

    return state
  }),
  setCurrentLayer: (id: LayerID) => set((state) => {
    const _currentLayerIndex = state.layers.findIndex((layer) => layer.id === id)

    currentLayerIndex = _currentLayerIndex

    return { currentLayer: state.layers[_currentLayerIndex] }
  }),
  saveNewName: (id: LayerID, name: LayerName) => set((state) => {
    const newLayers = state.layers.map(layer => {
      if (id === layer.id) {
        return { ...layer, name }
      }
      return layer
    })

    return { layers: newLayers, currentLayer: { ...state.currentLayer, name }, editingLayer: 0 }
  })
  
}))

export const useLayerStore = createSelectors(useLayerStoreBase)