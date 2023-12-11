import "./styles.css"
import Panel from '../Panel'
import Container from '../Container'
import Layer from '../Layer'

import { useLayerStore } from "../../stores/LayerStore"

function _Layers() {
  const layers = useLayerStore.use.layers()
  const currentLayer = useLayerStore.use.currentLayer()
  const setCurrentLayer = useLayerStore.use.setCurrentLayer()
  const newLayer = useLayerStore.use.newLayer()
  const removeLayer = useLayerStore.use.removeLayer()
  const saveNewName = useLayerStore.use.saveNewName()
  const editingLayer = useLayerStore.use.editingLayer()

  return (
    <Container className="layers">
      {/* <Panel className="layer_settings">
        <span>blend mode</span>
        <span>opacity</span>
      </Panel> */}
      <Panel className="layer_list">
        {layers.map((layer, idx) => {
          return <Layer
            saveNewName={saveNewName}
            editing={!!editingLayer && editingLayer === layer.id}
            key={layer.name + idx}
            name={layer.name}
            id={layer.id}
            select={setCurrentLayer}
            selected={currentLayer.id === layer.id}
          />})}

      </Panel>
      <Panel className="edit_layers">
        <button onClick={() => newLayer()}>ADD</button>
        <button onClick={() => removeLayer()}>REMOVE</button>
      </Panel>
    </Container>
  )
}

export const Layers = _Layers
