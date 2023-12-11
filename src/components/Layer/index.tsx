import { useState, useCallback } from 'react'

import PanelElement from '../PanelElement'

import { useLayerStore } from '../../stores/LayerStore'

import { LayerName, LayerID } from '../../types'

function Layer({ name, select, selected, id, editing, saveNewName }: { name: LayerName, select: (id: number) => void, selected: boolean, id: LayerID, editing: boolean, saveNewName: (id: number, name: string) => void }) {
  const setEditingLayer = useLayerStore.use.setEditingLayer()

  const [newName, setNewName] = useState(name)

  const save = useCallback(() => {
    console.log(newName)
    if (newName) {
      saveNewName(id, newName)
    } else {
      saveNewName(id, name)
    }
  }, [id, name, newName])

  return (
    <PanelElement selected={selected} select={select} id={id} onDoubleClick={() => setEditingLayer(id)}>
        {!editing ? 
        <p className='w-28 m-0 truncate'>{name}</p>
        :
        <input className='w-28 m-0' autoFocus placeholder={name} value={newName} onBlur={save} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") {
            save()
          }
        }}/>
        }
    </PanelElement>
  )
}

export default Layer
