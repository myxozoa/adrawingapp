import { create } from "zustand"
import { LayerID, LayerName } from "@/types"

import { Layer } from "@/objects/Layer"

import { DrawingManager } from "@/managers/DrawingManager"

import { createSelectors } from "@/stores/selectors"
import { ResourceManager } from "@/managers/ResourceManager"
import type { blend_modes } from "@/constants"

interface State {
  layerStorage: Map<LayerID, Layer>
  layers: LayerID[]
  currentLayer: LayerID
  editingLayer: LayerID | null
}

interface Action {
  setLayers: (layers: Layer[]) => void
  setEditingLayer: (id: LayerID) => void
  setCurrentLayer: (id: LayerID) => void
  newLayer: () => void
  removeLayer: () => void
  saveNewName: (id: LayerID, name: LayerName) => void
  setOpacity: (id: LayerID, opacity: number) => void
  setBlendMode: (id: LayerID, blendMode: blend_modes) => void
  setClippingMask: (id: LayerID, clippingMask: boolean) => void
  keepCurrentLayerInSync: () => void
  deleteAll: () => void
}

const baseLayer = new Layer("New Layer")

let currentLayerIndex = 0

const useLayerStoreBase = create<State & Action>((set) => ({
  layerStorage: new Map([[baseLayer.id, baseLayer]]),
  layers: [baseLayer.id],
  currentLayer: baseLayer.id,
  editingLayer: null,
  keepCurrentLayerInSync: () =>
    set((state) => {
      if (!state.layerStorage.get(state.currentLayer)) {
        if (currentLayerIndex > state.layers.length - 1) {
          currentLayerIndex = state.layers.length - 1
        }
        state.setCurrentLayer(state.layers[currentLayerIndex])
      }

      return state
    }),
  setLayers: (layers: Layer[]) =>
    set((state) => {
      const newLayers = layers.map((layer) => {
        state.layerStorage.set(layer.id, layer)

        return layer.id
      })

      return {
        layers: newLayers,
      }
    }),
  setEditingLayer: (id: string) =>
    set(() => ({
      editingLayer: id,
    })),
  newLayer: () => {
    set((state) => {
      // if (state.layers.length > 9) return state

      const newLayer = new Layer(`New Layer (${state.layers.length})`)

      void newLayer.setupThumbnail()

      state.layerStorage.set(newLayer.id, newLayer)

      DrawingManager.newLayer(newLayer)

      currentLayerIndex++

      return { ...state, currentLayer: newLayer.id, layers: [...state.layers, newLayer.id] }
    })

    DrawingManager.fullyRecomposite()
    DrawingManager.beginDraw()
    DrawingManager.pauseDrawNextFrame()
  },
  removeLayer: () => {
    set((state) => {
      if (state.currentLayer && state.layers.length && state.layers.length > 1) {
        ResourceManager.delete(`Layer${state.currentLayer}`)
        const newLayers = [...state.layers].filter((layer) => {
          return layer !== state.currentLayer
        })

        if (currentLayerIndex > newLayers.length - 1) {
          currentLayerIndex = newLayers.length - 1
        }

        return { ...state, layers: newLayers, currentLayer: newLayers[currentLayerIndex] }
      }

      return state
    })

    DrawingManager.fullyRecomposite()
    DrawingManager.beginDraw()
    DrawingManager.pauseDrawNextFrame()
  },
  setCurrentLayer: (id: LayerID) => {
    set((state) => {
      const _currentLayerIndex = state.layers.findIndex((layer) => layer === id)

      currentLayerIndex = _currentLayerIndex

      return { ...state, currentLayer: id }
    })

    DrawingManager.fullyRecomposite()
    DrawingManager.beginDraw()
    DrawingManager.pauseDrawNextFrame()
  },
  saveNewName: (id: LayerID, name: LayerName) =>
    set((state) => {
      const layer = state.layerStorage.get(id)

      if (layer) layer.name = name
      else throw new Error("Layer not found")

      return { ...state, currentLayer: state.currentLayer, layers: [...state.layers], editingLayer: null }
    }),
  setOpacity: (id: LayerID, opacity: number) => {
    set((state) => {
      const layer = state.layerStorage.get(id)

      if (layer) layer.opacity = opacity
      else throw new Error("Layer not found")

      return { ...state, currentLayer: state.currentLayer, layers: [...state.layers], editingLayer: null }
    })
    DrawingManager.fullyRecomposite()
    DrawingManager.beginDraw()
    DrawingManager.pauseDrawNextFrame()
  },
  setBlendMode: (id: LayerID, blendMode: blend_modes) => {
    set((state) => {
      const layer = state.layerStorage.get(id)

      if (layer) layer.blendMode = blendMode
      else throw new Error("Layer not found")

      return { ...state, currentLayer: state.currentLayer, layers: [...state.layers], editingLayer: null }
    })
    DrawingManager.fullyRecomposite()
    DrawingManager.beginDraw()
    DrawingManager.pauseDrawNextFrame()
  },
  setClippingMask: (id: LayerID, clippingMask: boolean) => {
    set((state) => {
      const layer = state.layerStorage.get(id)

      if (layer) layer.clippingMask = clippingMask
      else throw new Error("Layer not found")

      return { ...state, currentLayer: state.currentLayer, layers: [...state.layers], editingLayer: null }
    })
    DrawingManager.fullyRecomposite()
    DrawingManager.beginDraw()
    DrawingManager.pauseDrawNextFrame()
  },
  deleteAll: () => {
    set((state) => {
      baseLayer.reset()
      state.layerStorage.clear()
      state.layerStorage.set(baseLayer.id, baseLayer)
      return { ...state, currentLayer: baseLayer.id, layers: [baseLayer.id], editingLayer: null }
    })
  },
}))

export const useLayerStore = createSelectors(useLayerStoreBase)

export const getLayer = (id: LayerID) => {
  const layer = useLayerStore.getState().layerStorage.get(id)

  if (layer === undefined) throw new Error(`Layer ${id} not found`)

  return layer
}

export const getCurrentLayer = () => {
  const currentLayerID = useLayerStore.getState().currentLayer

  return getLayer(currentLayerID)
}
