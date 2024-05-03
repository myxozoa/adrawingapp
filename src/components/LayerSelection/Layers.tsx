import Panel from "@/components/Panel"
import Container from "@/components/Container"
import Layer from "@/components/LayerSelection/Layer"

import { Button } from "@/components/ui/button"

import { Trash2, FilePlus2 } from "lucide-react"

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
    <Container className="absolute right-0 top-1/2 h-1/2 w-36 -translate-y-1/2">
      <Panel className="mb-1 w-full grow overflow-y-auto shadow-md">
        {layers
          .map((layer, idx) => {
            return (
              <Layer
                saveNewName={saveNewName}
                editing={!!editingLayer && editingLayer === layer.id}
                key={layer.name + idx}
                name={layer.name}
                id={layer.id}
                select={setCurrentLayer}
                selected={currentLayer.id === layer.id}
              />
            )
          })
          .reverse()}
      </Panel>
      <Panel className="mt-0 flex w-full justify-between shadow-md">
        <Button variant="outline" size="sm" className="w-1/2" onClick={() => newLayer()}>
          <FilePlus2 className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        <Button variant="outline" size="sm" className="w-1/2" onClick={() => removeLayer()}>
          <Trash2 className="h-5 w-5" strokeWidth={1.5} />
        </Button>
      </Panel>
    </Container>
  )
}

export const Layers = _Layers
