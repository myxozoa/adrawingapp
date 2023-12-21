import Panel from '@/components/Panel'
import Container from '@/components/Container'
import Layer from '@/components/Layer'

import { useLayerStore } from "@/stores/LayerStore"

function _Layers() {
  const layers = useLayerStore.use.layers()
  const currentLayer = useLayerStore.use.currentLayer()
  const setCurrentLayer = useLayerStore.use.setCurrentLayer()
  const newLayer = useLayerStore.use.newLayer()
  const removeLayer = useLayerStore.use.removeLayer()
  const saveNewName = useLayerStore.use.saveNewName()
  const editingLayer = useLayerStore.use.editingLayer()

  return (
    <Container className="w-38">
      <Panel className="grow w-full overflow-y-auto">
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
      <Panel className="mt-0">
        <button onClick={() => newLayer()}>ADD</button>
        <button onClick={() => removeLayer()}>REMOVE</button>
      </Panel>
    </Container>
  )
}

export const Layers = _Layers
