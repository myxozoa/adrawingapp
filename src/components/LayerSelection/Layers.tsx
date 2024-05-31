import { Panel } from "@/components/Panel"
import { Container } from "@/components/Container"
import { Layer } from "@/components/LayerSelection/Layer"

import { Button } from "@/components/ui/button"

import { Trash2, FilePlus2 } from "lucide-react"

import { useLayerStore } from "@/stores/LayerStore"

import { SettingSlider } from "@/components/SettingSlider"
import { memo } from "react"

function _Layers() {
  const LayerStore = useLayerStore()

  const currentLayer = LayerStore.layerStorage.get(LayerStore.currentLayer)!

  return (
    <Container className="absolute right-0 top-1/2 h-1/2 w-48 -translate-y-1/2">
      <Panel className="mb-1 flex w-full shrink-0 justify-between py-2 shadow-md">
        <SettingSlider
          name={"Opacity"}
          value={currentLayer.opacity}
          id={LayerStore.currentLayer}
          onValueChange={(opacity) => LayerStore.setOpacity(LayerStore.currentLayer, opacity)}
          fractionDigits={0}
          min={0}
          max={100}
        />
      </Panel>
      <Panel className="mb-1 w-full grow overflow-y-scroll shadow-md">
        {LayerStore.layers
          .map((layerID, idx) => {
            const layer = LayerStore.layerStorage.get(layerID)!
            return (
              <Layer
                saveNewName={LayerStore.saveNewName}
                editing={!!LayerStore.editingLayer && LayerStore.editingLayer === layerID}
                key={layer.name + idx}
                name={layer.name}
                id={layerID}
                select={LayerStore.setCurrentLayer}
                selected={LayerStore.currentLayer === layerID}
              />
            )
          })
          .reverse()}
      </Panel>
      <Panel className="mt-0 flex w-full shrink-0 justify-between shadow-md">
        <Button variant="outline" size="sm" className="w-1/2" onClick={() => LayerStore.newLayer()}>
          <FilePlus2 className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        <Button variant="outline" size="sm" className="w-1/2" onClick={() => LayerStore.removeLayer()}>
          <Trash2 className="h-5 w-5" strokeWidth={1.5} />
        </Button>
      </Panel>
    </Container>
  )
}

export const Layers = memo(_Layers)
