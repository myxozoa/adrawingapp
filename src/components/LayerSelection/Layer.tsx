import { useState, useCallback } from "react"

import PanelElement from "@/components/PanelElement"

import { useLayerStore } from "@/stores/LayerStore"

import { LayerName, LayerID } from "@/types"

function Layer({
  name,
  select,
  selected,
  id,
  editing,
  saveNewName,
}: {
  name: LayerName
  select: (id: string) => void
  selected: boolean
  id: LayerID
  editing: boolean
  saveNewName: (id: string, name: string) => void
}) {
  const setEditingLayer = useLayerStore.use.setEditingLayer()

  const [newName, setNewName] = useState(name)

  const save = useCallback(() => {
    if (newName) {
      saveNewName(id, newName)
    } else {
      saveNewName(id, name)
    }
  }, [id, name, newName])

  return (
    <PanelElement className="h-8" selected={selected} select={select} id={id} onDoubleClick={() => setEditingLayer(id)}>
      {!editing ? (
        <p className="m-0 w-28 truncate text-sm">{name}</p>
      ) : (
        <input
          className="m-0 h-5 w-28 bg-input text-sm focus:outline focus:outline-1 focus:outline-secondary-foreground"
          autoFocus
          placeholder={name}
          value={newName}
          onBlur={save}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              save()
            }
          }}
        />
      )}
    </PanelElement>
  )
}

export default Layer
