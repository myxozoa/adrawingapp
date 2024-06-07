import { useCallback, useState } from "react"

import { Panel } from "@/components/Panel"
import { Container } from "@/components/Container"
import { Layer } from "@/components/LayerSelection/Layer"

import { Button } from "@/components/ui/button"

import { TrashIcon, FilePlusIcon, LayersIcon } from "@radix-ui/react-icons"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { useLayerStore } from "@/stores/LayerStore"

import { SettingSlider } from "@/components/SettingSlider"
import { blendModeNames, blend_modes } from "@/constants"

function _Layers() {
  const [showLayers, setShowLayers] = useState(false)
  const LayerStore = useLayerStore()

  const currentLayer = LayerStore.layerStorage.get(LayerStore.currentLayer)!

  const toggleLayers = useCallback(() => {
    setShowLayers(!showLayers)
  }, [showLayers])

  const changeOpacity = useCallback(
    (opacity: number) => LayerStore.setOpacity(LayerStore.currentLayer, opacity),
    [LayerStore.currentLayer],
  )

  const select = useCallback((id: string) => {
    LayerStore.setCurrentLayer(id)
  }, [])

  const renderLayer = useCallback(
    (layerID: string, idx: number) => {
      const layer = LayerStore.layerStorage.get(layerID)!
      return (
        <Layer
          saveNewName={LayerStore.saveNewName}
          editing={!!LayerStore.editingLayer && LayerStore.editingLayer === layerID}
          key={layer.name + idx}
          name={layer.name}
          id={layerID}
          select={select}
          selected={LayerStore.currentLayer === layerID}
        />
      )
    },
    [LayerStore.editingLayer, LayerStore.currentLayer],
  )

  return (
    <div className="absolute right-0 top-1/4 flex flex-col items-end">
      <Button className="h-10 w-10 p-1" variant="outline" onClick={toggleLayers}>
        <LayersIcon className="h-5 w-5" />
      </Button>
      <Container className={`${showLayers ? "" : "hidden"} h-[50vh] w-48 grow`}>
        <Panel className="mb-1 flex w-full shrink-0 justify-between py-2 shadow-md">
          <SettingSlider
            name={"Opacity"}
            value={currentLayer.opacity}
            id={LayerStore.currentLayer}
            onValueChange={changeOpacity}
            fractionDigits={0}
            min={0}
            max={100}
          />
        </Panel>
        <Panel className="mb-1 flex w-full shrink-0 justify-between py-2 shadow-md">
          <Select
            value={currentLayer.blendMode.toString()}
            onValueChange={(value) =>
              LayerStore.setBlendMode(LayerStore.currentLayer, Number(value) as unknown as blend_modes)
            }
          >
            <SelectTrigger className="pl-4">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {blendModeNames.map((mode, idx) => {
                  return (
                    <SelectItem key={`blendModes${idx}`} value={idx.toString()}>
                      {mode}
                    </SelectItem>
                  )
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Panel>

        <Panel className="mb-1 w-full grow overflow-y-scroll shadow-md">
          {LayerStore.layers.map(renderLayer).reverse()}
        </Panel>
        <Panel className="mt-0 flex w-full shrink-0 justify-between shadow-md">
          <Button variant="outline" size="sm" className="w-1/2" onClick={LayerStore.newLayer}>
            <FilePlusIcon className="h-5 w-5" />
          </Button>

          <Button variant="outline" size="sm" className="w-1/2" onClick={LayerStore.removeLayer}>
            <TrashIcon className="h-5 w-5" />
          </Button>
        </Panel>
      </Container>
    </div>
  )
}

export const Layers = _Layers
