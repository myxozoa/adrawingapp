import { useState, useCallback, memo } from "react"

import { PanelElement } from "@/components/PanelElement"

import { useLayerStore } from "@/stores/LayerStore"

import type { LayerName, LayerID } from "@/types"
import { compareProps } from "@/utils/utils"

function _Layer({
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

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => setNewName(event.target.value), [])
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        save()
      }
    },
    [id, name, newName],
  )

  const editLayer = useCallback(() => setEditingLayer(id), [id])

  return (
    <PanelElement className="h-8" selected={selected} select={select} id={id} onDoubleClick={editLayer}>
      <div className="mr-2 w-fit bg-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="layer_thumbnail max-h-5 max-w-[1.25rem]  object-contain"
          id={`thumbnail_${id}`}
          alt="thumbnail"
        />
      </div>
      {!editing ? (
        <p className="m-0 w-28 truncate text-sm">{name}</p>
      ) : (
        <input
          className="m-0 h-5 w-28 bg-input text-sm focus:outline focus:outline-1 focus:outline-secondary-foreground"
          autoFocus
          placeholder={name}
          value={newName}
          onBlur={save}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />
      )}
    </PanelElement>
  )
}

export const Layer = memo(_Layer, compareProps(["editing", "name", "selected", "id"]))
