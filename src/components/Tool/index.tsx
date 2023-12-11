import PanelElement from '../PanelElement'
import { ToolName } from '../../types'

function Tool({ name, select, selected }: { name: ToolName, select: (name: ToolName) => void, selected: boolean }) {
  return (
    <PanelElement selected={selected} select={select} id={name}>
        <p className='m-0'>{name}</p>
    </PanelElement>
  )
}

export default Tool
