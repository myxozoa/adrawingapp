import { useEffect, useState, useRef, useCallback } from 'react'

import { LayerState } from '../../contexts/LayerState'
import { Layer } from '../../objects/Layer'

import { LayerID, LayerName } from '../../types'

const baseLayer = new Layer("New Layer")

function LayerStateProvider({ children }: { children: React.ReactNode }) {
  const [layers, setLayers] = useState([baseLayer])
  const [currentLayer, _setCurrentLayer] = useState(baseLayer)
  const [editingLayer, setEditingLayer] = useState<number>(0)

  const currentLayerIndex = useRef(0)

  const newLayer = useCallback(() => {
    if (layers.length > 9) return;

    const newLayer = new Layer(`New Layer (${layers.length})`)
    currentLayerIndex.current = 0
    _setCurrentLayer(newLayer)
    setLayers([newLayer, ...layers])

    return newLayer
  }, [layers, currentLayerIndex])

  const removeLayer = useCallback(() => {
    if (currentLayerIndex && currentLayer && layers.length > 1 && layers.length) {

      setLayers([...layers].filter((layer) => {
        return layer.id !== currentLayer.id
      }))
    }
  }, [currentLayerIndex, currentLayer, layers])

  const setCurrentLayer = useCallback((id: LayerID) => {
    const _currentLayerIndex = layers.findIndex((layer) => layer.id === id)

    currentLayerIndex.current = _currentLayerIndex

    _setCurrentLayer(layers[_currentLayerIndex])
  }, [layers, currentLayerIndex])

  const saveNewName = useCallback((id: LayerID, name: LayerName) => {
    setEditingLayer(0)

    setLayers(layers.map(layer => {
      if (id === layer.id) {
        return { ...layer, name }
      }
      return layer
    }))
  }, [layers])

  useEffect(() => {
    layers[0].fill()
  }, [])

  useEffect(() => {
    const currentLayerExists = layers.find((layer) => layer.id === currentLayer.id)

    if (!currentLayerExists) {

      if (currentLayerIndex.current > layers.length - 1) {
        currentLayerIndex.current = layers.length - 1
      }
      setCurrentLayer(layers[currentLayerIndex.current].id)
    }
  }, [layers, currentLayer, currentLayerIndex])


  return (
      <LayerState.Provider value={{ layers, setLayers, currentLayer, setCurrentLayer, newLayer, removeLayer, saveNewName, editingLayer, setEditingLayer }}>
        {children}
      </LayerState.Provider>
  )
}

export default LayerStateProvider
