import { create } from "zustand"
import { LayerID, LayerName } from "@/types"

import { Layer } from "@/objects/Layer"

import { DrawingManager } from "@/managers/DrawingManager"

import { createSelectors } from "@/stores/selectors"
import { ResourceManager } from "@/managers/ResourceManager"
import { throttleRAF } from "@/utils"

interface State {
  layers: Layer[]
  currentLayer: Layer
  editingLayer: LayerID | null
}

interface Action {
  setLayers: (layers: Layer[]) => void
  _setCurrentLayer: (layer: Layer) => void
  setEditingLayer: (id: LayerID) => void
  setCurrentLayer: (id: LayerID) => void
  newLayer: () => void
  removeLayer: () => void
  saveNewName: (id: LayerID, name: LayerName) => void
  setOpacity: (id: LayerID, opacity: number) => void
  keepCurrentLayerInSync: () => void
}

const baseLayer = new Layer("New Layer")

let currentLayerIndex = 0

const useLayerStoreBase = create<State & Action>((set) => ({
  layers: [baseLayer],
  currentLayer: baseLayer,
  editingLayer: null,
  keepCurrentLayerInSync: () =>
    set((state) => {
      const currentLayerExists = state.layers.find((layer) => layer.id === state.currentLayer.id)

      if (!currentLayerExists) {
        if (currentLayerIndex > state.layers.length - 1) {
          currentLayerIndex = state.layers.length - 1
        }
        state.setCurrentLayer(state.layers[currentLayerIndex].id)
      }

      return state
    }),
  setLayers: (layers: Layer[]) =>
    set(() => ({
      layers,
    })),
  _setCurrentLayer: (layer: Layer) =>
    set(() => ({
      currentLayer: layer,
    })),
  setEditingLayer: (id: string) =>
    set(() => ({
      editingLayer: id,
    })),
  newLayer: () => {
    set((state) => {
      // if (state.layers.length > 9) return state

      const newLayer = new Layer(`New Layer (${state.layers.length})`)

      DrawingManager.newLayer(newLayer)

      currentLayerIndex++

      return { ...state, currentLayer: newLayer, layers: [...state.layers, newLayer] }
    })

    DrawingManager.recomposite()
  },
  removeLayer: () => {
    set((state) => {
      if (state.currentLayer && state.layers.length && state.layers.length > 1) {
        ResourceManager.delete(`Layer${state.currentLayer.id}`)
        const newLayers = [...state.layers].filter((layer) => {
          return layer.id !== state.currentLayer.id
        })

        if (currentLayerIndex > newLayers.length - 1) {
          currentLayerIndex = newLayers.length - 1
        }

        return { ...state, layers: newLayers, currentLayer: newLayers[currentLayerIndex] }
      }

      return state
    })

    DrawingManager.recomposite()
  },
  setCurrentLayer: (id: LayerID) => {
    set((state) => {
      const _currentLayerIndex = state.layers.findIndex((layer) => layer.id === id)

      currentLayerIndex = _currentLayerIndex

      return { ...state, currentLayer: state.layers[_currentLayerIndex] }
    })

    DrawingManager.recomposite()
  },
  saveNewName: (id: LayerID, name: LayerName) =>
    set((state) => {
      const newLayers = state.layers.map((layer) => {
        if (id === layer.id) {
          return { ...layer, name }
        }
        return layer
      })

      return { ...state, layers: newLayers, currentLayer: { ...state.currentLayer, name }, editingLayer: null }
    }),
  setOpacity: (id: LayerID, opacity: number) => {
    set((state) => {
      const newLayers = state.layers.map((layer) => {
        if (id === layer.id) {
          return { ...layer, opacity }
        }
        return layer
      })

      return { ...state, layers: newLayers, currentLayer: { ...state.currentLayer, opacity }, editingLayer: null }
    })
    DrawingManager.recomposite()
    DrawingManager.beginDraw()
    DrawingManager.pauseDraw()
  },
}))

export const useLayerStore = createSelectors(useLayerStoreBase)
