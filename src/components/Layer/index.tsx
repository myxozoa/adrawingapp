import { useState, useCallback } from 'react'

import './styles.css'

import PanelElement from '../PanelElement'

import { useLayerStore } from '../../stores/LayerStore'

import { LayerName, LayerID } from '../../types'

function Layer({ name, select, selected, id, editing, saveNewName }: { name: LayerName, select: (id: number) => void, selected: boolean, id: LayerID, editing: boolean, saveNewName: (id: number, name: string) => void }) {
  const setEditingLayer = useLayerStore.use.setEditingLayer()

  const [newName, setNewName] = useState("")

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
        <p className='layer_label'>{name}</p>
        :
        <input autoFocus placeholder={name} value={newName} onBlur={save} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") {
            save()
          }
        }}/>
        }
    </PanelElement>
  )
}

export default Layer
