import './styles.css'

import PanelElement from '../PanelElement'
import { ToolName } from '../../types'

function Tool({ name, select, selected }: { name: ToolName, select: (name: ToolName) => void, selected: boolean }) {
  return (
    <PanelElement selected={selected} select={select} id={name}>
        <p className='tool_label'>{name}</p>
    </PanelElement>
  )
}

export default Tool
