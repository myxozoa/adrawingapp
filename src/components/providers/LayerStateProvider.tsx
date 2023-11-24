import { useEffect, useState, useRef } from 'react'

import { LayerState } from '../../contexts/LayerState'
import { Layer } from '../../objects/Layer'

const baseLayer = new Layer("New Layer")

function LayerStateProvider({ children }) {
  const [layers, setLayers] = useState([baseLayer])
  const [currentLayer, _setCurrentLayer] = useState(baseLayer)
  const [editingLayer, setEditingLayer] = useState(undefined)

  const currentLayerIndex = useRef(0)

  const newLayer = () => {
    if (layers.length > 9) return;

    const newLayer = new Layer(`New Layer (${layers.length})`)
    currentLayerIndex.current = 0
    _setCurrentLayer(newLayer)
    setLayers([newLayer, ...layers])

    return newLayer
  }

  const removeLayer = () => {
    if (currentLayerIndex && currentLayer && layers.length > 1 && layers.length) {

      setLayers([...layers].filter((layer) => {
        return layer.id !== currentLayer.id
      }))
    }
  }

  const setCurrentLayer = (id) => {
    const _currentLayerIndex = layers.findIndex((layer) => layer.id === id)

    currentLayerIndex.current = _currentLayerIndex

    _setCurrentLayer(layers[_currentLayerIndex])
  }

  const saveNewName = (id, name) => {
    setEditingLayer(undefined)

    setLayers(layers.map(layer => {
      if (id === layer.id) {
        return { ...layer, name }
      }
      return layer
    }))
  }

  useEffect(() => {
    layers[0].fill()
  }, [])

  useEffect(() => {
    const currentLayerExists = layers.find((layer) => layer.id === currentLayer)

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
